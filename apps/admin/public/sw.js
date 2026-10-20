// ABSHER BI — الإدارة Service Worker
const CACHE = 'absher-admin-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {});

// ═══ Push Notification ═══
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'ABSHER BI — الإدارة', body: event.data.text() };
  }

  const title = data.title || 'ABSHER BI — الإدارة';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    tag: 'absher-admin',
    renotify: true,
    requireInteraction: data.priority === 'high' || data.priority === 'urgent',
    color: '#a855f7',
    data: {
      url: data.actionUrl || data.data?.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ═══ Notification Click ═══
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // ابحث عن نافذة مفتوحة
      for (const win of wins) {
        if (win.url.includes(self.location.origin)) {
          if ('focus' in win) {
            win.navigate(targetUrl);
            return win.focus();
          }
        }
      }
      // افتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ═══ Message من الصفحة (مثل: logout, clear) ═══
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
