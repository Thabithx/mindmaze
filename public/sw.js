// Mind Maze Study Planner Service Worker for GCE A/L
const CACHE_NAME = 'mind-maze-pwa-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
];

// Install: Cache essential shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Precache failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Hostnames that always belong to local development (Vite dev server, HMR).
const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

// Decide whether this request must bypass the service worker entirely.
// Returning true lets the browser handle the request normally.
function shouldBypass(request) {
  try {
    const url = new URL(request.url);
    // Never interfere with local dev servers (e.g. localhost:3000 + HMR).
    if (DEV_HOSTNAMES.has(url.hostname)) return true;
    // Only manage same-origin http(s) traffic. This keeps the worker away
    // from Supabase / CDN / font origins and non-http(s) schemes
    // (chrome-extension:, blob:, data:) which cache.put() cannot store.
    if (url.origin !== self.location.origin) return true;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
    // Extra safety for Vite dev pipelines if ever served same-origin.
    if (
      url.pathname.startsWith('/@vite/') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/src/')
    ) {
      return true;
    }
  } catch {
    // Unparseable URL: safest to leave it alone.
    return true;
  }
  return false;
}

function offlineFallbackResponse() {
  return new Response('Mind Maze is offline. Reconnect to continue studying.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Fetch: Stale-while-revalidate with offline navigation fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (shouldBypass(event.request)) return;
  
  // Navigation requests: try network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => {
                // Cache update is best-effort; the network response is unaffected.
              });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          // Last resort must still be a valid Response (never undefined).
          return new Response(
            '<!doctype html><html><head><meta charset="UTF-8"><title>Mind Maze offline</title></head>' +
              '<body style="background:#0F1023;color:#fff;font-family:sans-serif;text-align:center;padding:48px">' +
              '<h1>Mind Maze is offline</h1><p>Reconnect to continue studying.</p></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
    return;
  }

  // Assets: stale-while-revalidate. Every code path below resolves to a real
  // Response so respondWith() never receives undefined (which throws
  // "Failed to convert value to 'Response'").
  event.respondWith(
    (async () => {
      let cachedResponse;
      try {
        cachedResponse = await caches.match(event.request);
      } catch {
        cachedResponse = undefined;
      }

      const revalidate = fetch(event.request).then(async (networkResponse) => {
        try {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
        } catch {
          // Cache update is best-effort; the network response is unaffected.
        }
        return networkResponse;
      });

      if (cachedResponse) {
        // Serve stale copy immediately; refresh the cache in the background.
        event.waitUntil(
          revalidate.then(
            () => undefined,
            () => undefined
          )
        );
        return cachedResponse;
      }

      try {
        return await revalidate;
      } catch {
        // Cache miss + network failure (offline): check the cache once more
        // in case it populated meanwhile, else return a valid fallback.
        try {
          const lateHit = await caches.match(event.request);
          if (lateHit) return lateHit;
        } catch {
          // Ignore and fall through to the fallback response.
        }
        return offlineFallbackResponse();
      }
    })()
  );
});

// Push & Notification handling
// Real Web Push: fired by the browser's push service even when all tabs
// are closed. Payload is JSON: { title, body, tag, url, icon, badge }.
// `url` may be an in-app path ("/") or a full external URL (e.g. WhatsApp
// channel). `icon` is per-type: only the WhatsApp quiz reminder sends a
// custom icon; everything else falls back to the app icon below.
self.addEventListener('push', (event) => {
  let data = { title: 'Mind Maze', body: 'Time to study!', tag: 'mind-maze-push', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON push: fall back to defaults above.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

// Subscription expired / rotated by the browser vendor (e.g. key rotation).
// The worker cannot re-subscribe on its own (no VAPID key here by design),
// so tell any open Mind Maze tab to re-run subscribeForPush(), which upserts
// the fresh endpoint into push_subscriptions. Stale endpoints are also pruned
// server-side on 404/410 during send (see supabase/functions/send-push).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' });
        } catch {
          // Best-effort; the next sign-in re-subscribes anyway (see App.tsx).
        }
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  // External URLs (e.g. WhatsApp channel) can't be handled with
  // client.navigate() (same-origin only) — open a new window/tab instead.
  let isExternal = false;
  try {
    if (/^https?:\/\//i.test(url)) {
      isExternal = new URL(url).origin !== self.location.origin;
    }
  } catch {
    isExternal = true;
  }
  event.waitUntil(
    (async () => {
      if (isExternal) {
        if (clients.openWindow) return clients.openWindow(url);
        return;
      }
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clientList.length > 0) {
        const client = clientList[0];
        if ('navigate' in client) return client.navigate(url).then((c) => c && c.focus());
        return client.focus();
      } else if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delayMs } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, options);
    }, delayMs || 0);
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

