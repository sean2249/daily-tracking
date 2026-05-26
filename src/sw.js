/* Pixie service worker — offline app shell + Web Push.
   injectManifest strategy: self.__WB_MANIFEST is the precache list. */
/* eslint-disable no-restricted-globals */

const MANIFEST = self.__WB_MANIFEST || [];
const PRECACHE = MANIFEST.map((e) => e.url);

// Version the cache name by the build's manifest so each deploy gets a fresh
// cache; the activate handler then drops every older cache, preventing stale
// hashed assets from accumulating across deploys.
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const REVISION = MANIFEST.map((e) => e.revision || e.url).join(',');
const CACHE = 'pixie-shell-' + hashString(REVISION);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Let cross-origin requests (Supabase API, Google Fonts) go straight to the network.
  if (url.origin !== self.location.origin) return;

  // App-shell navigation: network-first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('index.html')));
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful responses, so transient 404/500 error pages
        // don't get pinned in the cache until it's manually cleared.
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

// ─────────────────────────────── Web Push ───────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { body: event.data && event.data.text() };
  }
  const title = data.title || 'Pixie · Daily';
  const options = {
    body: data.body || 'You have tasks waiting today.',
    icon: data.icon || 'pwa-192.png',
    badge: data.badge || 'pwa-192.png',
    tag: data.tag || 'pixie-reminder',
    renotify: true,
    data: { url: data.url || '.' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || './';
  const target = new URL(raw, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Prefer a window already on the target URL; otherwise reuse any open one.
      const match = list.find((c) => c.url === target) || list[0];
      if (match) {
        return Promise.resolve(match.focus()).then((focused) => {
          const client = focused || match;
          // Make sure the reminder lands on its destination, not whatever
          // screen the tab happened to be on.
          if ('navigate' in client && client.url !== target) {
            return client.navigate(target).catch(() => client);
          }
          return client;
        });
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
