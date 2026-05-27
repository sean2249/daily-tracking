import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Sends daily reminder pushes. Invoked by pg_cron (every minute) with an
// 'x-cron-secret' header; not a user-facing endpoint, so JWT verification is
// off and we authenticate with the shared secret stored in dt_app_config.
Deno.serve(async (req: Request) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: cfg, error: cfgErr } = await admin
    .from("dt_app_config").select("*").eq("id", 1).single();
  if (cfgErr || !cfg) {
    return new Response(JSON.stringify({ error: "missing config" }), { status: 500 });
  }

  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== cfg.cron_secret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  if (!cfg.vapid_public || !cfg.vapid_private) {
    return new Response(JSON.stringify({ error: "vapid not configured" }), { status: 500 });
  }
  webpush.setVapidDetails(cfg.vapid_subject ?? "mailto:admin@example.com", cfg.vapid_public, cfg.vapid_private);

  const { data: due, error } = await admin.rpc("dt_admin_due_reminders", {
    p_now: new Date().toISOString(),
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let removed = 0;
  for (const row of (due ?? [])) {
    const payload = JSON.stringify({ title: row.title, body: row.body, url: "." });
    let anySent = false;
    for (const sub of (row.subscriptions ?? [])) {
      const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
        anySent = true;
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("dt_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          removed++;
        } else {
          console.error("push failed", status, (e as Error)?.message);
        }
      }
    }
    if (anySent) {
      await admin.from("dt_notification_log")
        .insert({ user_id: row.user_id, kind: "daily", ref_date: row.ref_date });
    }
  }

  return new Response(JSON.stringify({ ok: true, due: (due ?? []).length, sent, removed }), {
    headers: { "Content-Type": "application/json" },
  });
});
