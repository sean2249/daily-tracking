-- Teardown of the previous Pixie·Daily backend (gamification + chores + push),
-- run after the new dt_items/dt_item_logs model + app were verified.
-- Leaves the new tables intact and never touches other apps in this shared
-- project (commute*, restaurants, mood_logs, telegram_sessions, recommendation_logs).

-- 1) stop the orphaned reminder cron (daily-tracking's job only).
-- Guarded so it's a no-op on a fresh project where pg_cron / the job is absent.
do $$
begin
  perform cron.unschedule('dt-send-reminders');
exception when others then
  null; -- cron schema/function missing or job not scheduled: nothing to do
end $$;

-- 2) drop legacy tables (CASCADE clears their RLS policies + FKs)
drop table if exists public.dt_notification_log cascade;
drop table if exists public.dt_push_subscriptions cascade;
drop table if exists public.dt_user_quests cascade;
drop table if exists public.dt_user_achievements cascade;
drop table if exists public.dt_achievement_defs cascade;
drop table if exists public.dt_chore_completions cascade;
drop table if exists public.dt_habit_completions cascade;
drop table if exists public.dt_chores cascade;
drop table if exists public.dt_habits cascade;
drop table if exists public.dt_profiles cascade;
drop table if exists public.dt_app_config cascade;

-- 3) drop legacy RPCs (none are used by the new client)
drop function if exists public.dt_admin_due_reminders(timestamp with time zone);
drop function if exists public.dt_bootstrap();
drop function if exists public.dt_delete_chore(uuid);
drop function if exists public.dt_delete_habit(uuid);
drop function if exists public.dt_delete_subscription(text);
drop function if exists public.dt_get_household();
drop function if exists public.dt_get_overview(date);
drop function if exists public.dt_join_household(text);
drop function if exists public.dt_list_chores();
drop function if exists public.dt_list_habits();
drop function if exists public.dt_rename_household(text);
drop function if exists public.dt_save_chore(jsonb);
drop function if exists public.dt_save_habit(jsonb);
drop function if exists public.dt_save_settings(jsonb);
drop function if exists public.dt_save_subscription(jsonb);
drop function if exists public.dt_toggle_chore(uuid, date);
drop function if exists public.dt_toggle_habit(uuid, date);

-- NOTE: the orphaned Edge Function `dt-send-reminders` must be deleted from the
-- Supabase dashboard (Edge Functions) — there's no SQL/MCP path to remove it.
