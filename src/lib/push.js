// push.js — browser Web Push helpers: permission, subscribe, and persisting the
// PushSubscription to dt_push_subscriptions (the Edge Function reads it to send).

import { supabase } from './supabase.js';
import { VAPID_PUBLIC_KEY } from './config.js';

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function pushPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'default';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  if (!pushSupported()) {
    return { ok: false, reason: 'This browser does not support push notifications.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'Push is not configured.' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, reason: 'Notification permission was not granted.' };
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const { error } = await supabase.from('dt_push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      p256dh: json.keys && json.keys.p256dh,
      auth: json.keys && json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  );
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function disablePush() {
  const sub = await getSubscription();
  if (sub) {
    await supabase.from('dt_push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  return { ok: true };
}
