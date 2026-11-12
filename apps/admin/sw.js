/* ============================================================
   ABSHER BI — Service Worker v5
   Offline + Cache + Web Push Notifications
   ============================================================ */

var CACHE_VERSION = 'absher-v5-2026-10-08';
var STATIC_CACHE = CACHE_VERSION + '-static';
var API_CACHE    = CACHE_VERSION + '-api';
var IMAGE_CACHE  = CACHE_VERSION + '-images';

var STATIC_ASSETS = [
  './',
  './index.html',
  './splash.html',
  './offline.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/pages.css',
  './js/config.js',
  './js/state.js',
  './js/api.js',
  './js/ui.js',
  './js/skeleton.js',
  './js/empty-states.js',
  './js/auth.js',
  './js/profile.js',
  './js/profile-page.js',
  './js/addresses.js',
  './js/map-picker.js',
  './js/categories.js',
  './js/stores.js',
  './js/product-details.js',
  './js/cart.js',
  './js/checkout.js',
  './js/orders.js',
  './js/store-owner.js',
  './js/store-dashboard.js',
  './js/driver.js',
  './js/driver-dashboard.js',
  './js/admin.js',
  './js/admin-dashboard.js',
  './js/pull-refresh.js',
  './js/install-prompt.js',
  './js/app.js',
];

/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener('install', function (event) {
  console.log('[SW] Installing:', CACHE_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) {
        return cache.addAll(STATIC_ASSETS).catch(function (err) {
          console.warn('[SW] Cache warning:', err);
        });
      })
  );

  self.skipWaiting();
});

/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener('activate', function (event) {
  console.log('[SW] Activating:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return (
              key.indexOf('absher-') === 0 &&
              key.indexOf(CACHE_VERSION) === -1
            );
          })
          .map(function (key) {
            console.log('[SW] Delete old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ============================================================
   PUSH NOTIFICATIONS
   ============================================================ */

self.addEventListener('push', function (event) {
  console.log('[SW] PUSH received');

  var data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    try {
      data = {
        title: 'أبشر بي',
        body: event.data ? event.data.text() : 'لديك إشعار جديد'
      };
    } catch (e) {
      data = {};
    }
  }

  var title = data.title || 'أبشر بي';
  var body = data.body || 'لديك إشعار جديد';

  var notificationData = data.data || {};

  var notificationId =
    data.id ||
    notificationData.id ||
    '';

  var url =
    notificationData.url ||
    data.url ||
    './';

  var options = {
    body: body,

    icon: data.icon || './manifest.json',

    badge: data.badge || './manifest.json',

    tag:
      data.tag ||
      notificationId ||
      ('absher-' + Date.now()),

    renotify: true,

    requireInteraction:
      data.requireInteraction !== false,

    data: {
      url: url,
      id: notificationId,
      type: data.type || notificationData.type || 'SYSTEM',
      orderId: notificationData.orderId || data.orderId || null,
      orderNumber:
        notificationData.orderNumber ||
        data.orderNumber ||
        null
    }
  };

  /* الاهتزاز مدعوم في بعض الأجهزة/المتصفحات */
  if (Array.isArray(data.vibrate)) {
    options.vibrate = data.vibrate;
  } else {
    options.vibrate = [200, 100, 200, 100, 400];
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ============================================================
   NOTIFICATION CLICK
   ============================================================ */

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var data = event.notification.data || {};
  var targetUrl = data.url || './';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (clientList) {

      /* إذا التطبيق مفتوح نركز عليه */
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];

        if ('focus' in client) {
          return client.focus().then(function () {
            if ('navigate' in client && targetUrl) {
              return client.navigate(targetUrl);
            }
          });
        }
      }

      /* إذا التطبيق مغلق نفتح نافذة */
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/* ============================================================
   NOTIFICATION CLOSE
   ============================================================ */

self.addEventListener('notificationclose', function (event) {
  console.log('[SW] Notification closed');
});

/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  /* API */
  if (url.pathname.indexOf('/api/') !== -1) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  /* Images */
  if (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  /* HTML */
  if (
    request.mode === 'navigate' ||
    request.destination === 'document'
  ) {
    event.respondWith(navigateHandler(request));
    return;
  }

  /* Other assets */
  event.respondWith(staleWhileRevalidate(request));
});

/* ============================================================
   API — NETWORK FIRST
   ============================================================ */

function networkFirstAPI(request) {
  return fetch(request)
    .then(function (response) {

      if (response.ok) {
        var clone = response.clone();

        caches.open(API_CACHE).then(function (cache) {
          cache.put(request, clone);
        });
      }

      return response;
    })
    .catch(function () {
      return caches.match(request);
    });
}

/* ============================================================
   IMAGES — CACHE FIRST
   ============================================================ */

function cacheFirstImage(request) {
  return caches.match(request).then(function (cached) {

    if (cached) {

      fetch(request)
        .then(function (response) {

          if (response.ok) {
            caches.open(IMAGE_CACHE).then(function (cache) {
              cache.put(request, response);
            });
          }

        })
        .catch(function () {});

      return cached;
    }

    return fetch(request)
      .then(function (response) {

        if (response.ok) {
          var clone = response.clone();

          caches.open(IMAGE_CACHE).then(function (cache) {
            cache.put(request, clone);
          });
        }

        return response;
      })
      .catch(function () {
        return new Response('', {
          status: 404
        });
      });
  });
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function navigateHandler(request) {
  return fetch(request)
    .then(function (response) {

      var clone = response.clone();

      caches.open(STATIC_CACHE).then(function (cache) {
        cache.put(request, clone);
      });

      return response;
    })
    .catch(function () {

      return caches.match(request).then(function (cached) {
        return cached || caches.match('./offline.html');
      });

    });
}

/* ============================================================
   STATIC — STALE WHILE REVALIDATE
   ============================================================ */

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {

    var fetchPromise = fetch(request)
      .then(function (response) {

        if (response.ok) {

          var clone = response.clone();

          caches.open(STATIC_CACHE).then(function (cache) {
            cache.put(request, clone);
          });
        }

        return response;
      })
      .catch(function () {
        return cached;
      });

    return cached || fetchPromise;
  });
}

/* ============================================================
   MESSAGES
   ============================================================ */

self.addEventListener('message', function (event) {

  var data = event.data || {};

  if (data.action === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  if (data.action === 'clearCache') {

    event.waitUntil(

      caches.keys()
        .then(function (keys) {

          return Promise.all(

            keys
              .filter(function (key) {
                return key.indexOf('absher-') === 0;
              })
              .map(function (key) {
                return caches.delete(key);
              })

          );

        })
        .then(function () {

          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              status: 'cleared'
            });
          }

        })

    );
  }
});

console.log('[SW] ABSHER BI Service Worker v5 loaded');
