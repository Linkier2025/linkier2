const CACHE_VERSION = 'linkier-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Take control and clear old caches
self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Network-first for HTML / navigation
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets (images, icons, fonts)
  if (/\.(png|jpg|jpeg|svg|ico|woff2?|ttf|otf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
        const clone = resp.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
        return resp;
      }))
    );
    return;
  }

  // Network-first for everything else (JS, CSS)
  event.respondWith(
    fetch(request).then((resp) => {
      const clone = resp.clone();
      caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
      return resp;
    }).catch(() => caches.match(request))
  );
});
