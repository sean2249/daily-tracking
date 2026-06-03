/* Daily service worker — offline app shell only.
   injectManifest strategy: self.__WB_MANIFEST is the precache list. */
/* eslint-disable no-restricted-globals */

const MANIFEST = self.__WB_MANIFEST || [];
const PRECACHE = MANIFEST.map((e) => e.url);

// Version the cache by the build's manifest so each deploy gets a fresh cache;
// activate then drops older caches so stale hashed assets don't accumulate.
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const REVISION = MANIFEST.map((e) => e.revision || e.url).join(',');
const CACHE = 'daily-shell-' + hashString(REVISION);

// Precached app-shell, resolved against the SW scope so it matches the cache key
// under the GitHub Pages base path (e.g. /daily-tracking/index.html).
const SHELL_URL = new URL('index.html', self.registration.scope).href;

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

  // App-shell navigation: network-first, fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(SHELL_URL)));
    return;
  }

  // Static assets: cache-first, then network (and cache successful results).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
