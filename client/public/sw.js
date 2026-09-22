/* Mind Maze Service Worker - OS-Level Notifications */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Handle messages from the main app thread */
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, title, body, icon, tag, delay } = event.data;

  if (type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(title || 'Mind Maze', {
        body: body || 'Time to study!',
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || 'mind-maze-reminder',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: self.location.origin },
      })
    );
  }

  if (type === 'SCHEDULE_NOTIFICATION') {
    setTimeout(() => {
      self.registration.showNotification(title || 'Mind Maze Study Reminder', {
        body: body || 'Your scheduled study session is starting now!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || 'scheduled-reminder',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        data: { url: self.location.origin },
      });
    }, delay || 0);
  }
});

/* Handle notification clicks - focus/open the app */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

/* Handle push events (for future server-sent push) */
self.addEventListener('push', (event) => {
  let data = { title: 'Mind Maze', body: 'New update!' };
  try { if (event.data) data = event.data.json(); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'push-notification',
      vibrate: [200, 100, 200],
    })
  );
});
