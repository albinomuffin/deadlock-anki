const CACHE_NAME = 'deadlock-anki-gh-v20261117_141022';
const CORE_ASSETS = [
  './',
  './index.html',
  './deadlock_cards.json',
  './manifest.json',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (
    e.request.method !== 'GET' ||
    e.request.url.includes('/api/') ||
    e.request.url.includes('/__/') ||
    e.request.url.includes('googleapis.com') ||
    e.request.url.includes('gstatic.com') ||
    e.request.url.includes('firebase')
  ) {
    return;
  }

  // Network-first for index.html and deadlock_cards.json so users always get fresh patches automatically
  if (e.request.url.endsWith('.json') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // Cache-first (on-demand) for images and icons
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const networkFetch = fetch(e.request).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
