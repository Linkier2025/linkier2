const CACHE_VERSION = 'linkier-v3';
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

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Linkier', body: 'You have a new notification', data: { url: '/notifications' } };
  
  try {
    if (event.data) {
      const text = event.data.text();
      // Try parsing as JSON first
      try {
        data = JSON.parse(text);
      } catch {
        data.body = text;
      }
    }
  } catch (e) {
    // Use default data
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'linkier-notification',
    renotify: true,
    data: data.data || { url: '/notifications' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Linkier', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/notifications';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
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
