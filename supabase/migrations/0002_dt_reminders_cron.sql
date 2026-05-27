-- Schedule the reminder dispatcher: every 5 minutes pg_cron POSTs to the
-- dt-send-reminders Edge Function. The cron secret is read from dt_app_config
-- at call time, so it is never written into the job definition or committed to
-- version control. The function URL uses the (public) project ref.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop any prior schedule with this name before recreating it.
select cron.unschedule('dt-send-reminders')
where exists (select 1 from cron.job where jobname = 'dt-send-reminders');

select cron.schedule(
  'dt-send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://xwqgrpfcuohpstqinkxb.supabase.co/functions/v1/dt-send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select cron_secret from public.dt_app_config where id = 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
