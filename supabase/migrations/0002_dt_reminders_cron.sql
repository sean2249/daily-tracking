-- Schedule the reminder dispatcher: every 5 minutes pg_cron POSTs to the
-- dt-send-reminders Edge Function. Both the function base URL and the cron
-- secret are read from dt_app_config at call time, so the job definition is
-- environment-agnostic and carries no secrets — applying this on a staging or
-- branch DB targets that environment's function, not production.
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
    url := (select rtrim(function_base_url, '/') || '/dt-send-reminders'
              from public.dt_app_config where id = 1),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select cron_secret from public.dt_app_config where id = 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
