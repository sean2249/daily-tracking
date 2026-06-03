-- New "Daily" data model: items (habits|principles) + per-day completion logs.
-- Replaces the old gamification/chores schema. RLS keyed on auth.uid().

create table if not exists public.dt_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('habits','principles')),
  status text not null default 'active' check (status in ('active','archived')),
  start_date date not null,
  archive_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.dt_item_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.dt_items(id) on delete cascade,
  log_date date not null,
  is_completed boolean not null default true,
  unique (item_id, log_date)
);

create index if not exists dt_items_user_status_idx on public.dt_items (user_id, status);
create index if not exists dt_item_logs_user_idx on public.dt_item_logs (user_id);
create index if not exists dt_item_logs_item_idx on public.dt_item_logs (item_id);

alter table public.dt_items enable row level security;
alter table public.dt_item_logs enable row level security;

create policy dt_items_owner on public.dt_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dt_item_logs_owner on public.dt_item_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
