/* ABSHER BI — Service Worker (customer)
 * - كاش للملفات الثابتة فقط (/_next/static + الأيقونات)؛ لا يُخزَّن أي /api ولا صفحات فيها بيانات المستخدم.
 * - صفحة offline عند انقطاع الشبكة أثناء التنقل.
 * - استقبال Web Push وعرضه، والنقر عليه يفتح/يركّز التطبيق على الرابط المطلوب.
 */
const PREFIX = 'absher-customer-';
const VERSION = 'v4';
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // دائمًا من الشبكة

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'ABSHER BI', body: event.data ? event.data.text() : '' };
  }
  const title = payload.title || 'ABSHER BI';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: (payload.data && payload.data.url) || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  // لا نفتح روابط خارج النطاق أبدًا
  const href = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus().then((c) => ('navigate' in c ? c.navigate(href) : c));
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});
