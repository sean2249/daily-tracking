-- Web Push backend for the daily reminder feature.
-- Captures the live schema on project xwqgrpfcuohpstqinkxb so the push pipeline
-- is reproducible from the repo. Idempotent: safe to run on a fresh project.
-- Depends on the core tables (dt_profiles, dt_habits, dt_habit_completions,
-- dt_chores, dt_chore_completions) created by earlier migrations.

-- ── Push subscriptions ──────────────────────────────────────────────────────
-- One row per browser/device PushSubscription. Written by the client
-- (push.js) via upsert on the unique endpoint; the Edge Function reads them to
-- send and prunes dead ones (HTTP 404/410).
create table if not exists public.dt_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.dt_push_subscriptions enable row level security;
drop policy if exists dt_push_subs_owner on public.dt_push_subscriptions;
create policy dt_push_subs_owner on public.dt_push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Notification log (per-user/day de-dup) ──────────────────────────────────
-- Inserted by the service-role Edge Function after a successful send. The
-- unique (user_id, kind, ref_date) key is what stops a user being pinged twice
-- for the same day. Owners may read their own rows; inserts come from the
-- service role (which bypasses RLS).
create table if not exists public.dt_notification_log (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind     text not null,
  ref_date date not null,
  sent_at  timestamptz not null default now(),
  unique (user_id, kind, ref_date)
);

alter table public.dt_notification_log enable row level security;
drop policy if exists dt_notif_log_owner on public.dt_notification_log;
create policy dt_notif_log_owner on public.dt_notification_log
  for select using (user_id = auth.uid());

-- ── App config (server-only secrets) ────────────────────────────────────────
-- Single row (id = 1) holding the VAPID keypair + subject and the cron shared
-- secret. RLS is enabled with NO policy on purpose: only the service role can
-- read it, so the private VAPID key and cron secret are never exposed to
-- clients. Secret values are seeded out-of-band (kept out of version control).
create table if not exists public.dt_app_config (
  id            integer primary key default 1 check (id = 1),
  vapid_public  text,
  vapid_private text,
  vapid_subject text,
  cron_secret   text,
  updated_at    timestamptz not null default now()
);

alter table public.dt_app_config enable row level security;
insert into public.dt_app_config (id) values (1) on conflict (id) do nothing;

-- ── Due-reminder query (read by the Edge Function) ──────────────────────────
-- For each user whose local time is within the 5-minute window after their
-- reminder_time, counts still-pending habits/chores for today and, if any
-- remain and they haven't already been notified today, returns a title/body
-- plus the JSON array of their push subscriptions. SECURITY DEFINER so the
-- function can read across the user's rows; granted to service_role only.
create or replace function public.dt_admin_due_reminders(p_now timestamp with time zone default now())
 returns table(user_id uuid, ref_date date, title text, body text, subscriptions jsonb)
 language sql
 security definer
 set search_path to 'public'
as $function$
  with due as (
    select p.user_id, (p_now at time zone p.timezone) as lt, p.mess_tier
    from dt_profiles p
    where p.reminder_enabled
      and (p_now at time zone p.timezone)::time >= p.reminder_time
      and (p_now at time zone p.timezone)::time <  (p.reminder_time + interval '5 minutes')
  ),
  counts as (
    select d.user_id, (d.lt)::date as ref_date, d.mess_tier, d.lt,
      (select count(*) from dt_habits h
         where h.user_id = d.user_id and h.active
           and extract(dow from d.lt)::int = any(h.weekdays::int[])
           and not exists (select 1 from dt_habit_completions c
                           where c.habit_id = h.id and c.completed_date = (d.lt)::date)) as pending_habits,
      (select count(*) from dt_chores ch
         where ch.user_id = d.user_id and ch.active and ch.next_due is not null
           and ch.next_due <= (d.lt)::date
           and not exists (select 1 from dt_chore_completions cc
                           where cc.chore_id = ch.id and cc.due_date = (d.lt)::date)) as pending_chores
    from due d
  ),
  eligible as (
    select c.* from counts c
    where (c.pending_habits + c.pending_chores) > 0
      and exists (select 1 from dt_push_subscriptions s where s.user_id = c.user_id)
      and not exists (select 1 from dt_notification_log nl
                      where nl.user_id = c.user_id and nl.kind = 'daily' and nl.ref_date = c.ref_date)
  )
  select
    e.user_id,
    e.ref_date,
    'Pixie · Daily'::text as title,
    (
      case when e.mess_tier >= 2 then 'Your room''s getting messy! ' else '' end
      || e.pending_habits || ' habit' || case when e.pending_habits = 1 then '' else 's' end
      || ' and ' || e.pending_chores || ' chore' || case when e.pending_chores = 1 then '' else 's' end
      || ' left today.'
    ) as body,
    (select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
       from dt_push_subscriptions s where s.user_id = e.user_id) as subscriptions
  from eligible e;
$function$;

revoke all on function public.dt_admin_due_reminders(timestamp with time zone) from public, anon, authenticated;
grant execute on function public.dt_admin_due_reminders(timestamp with time zone) to service_role;
