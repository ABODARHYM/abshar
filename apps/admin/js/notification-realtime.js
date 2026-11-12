/* ============================================================
   ABSHER BI — notification-realtime.js
   إشعارات فورية عبر Socket.IO + JWT
   ============================================================ */
(function () {
  'use strict';

  var socket = null;
  var reconnectTimer = null;
  var reconnectDelay = 1000;
  var MAX_RECONNECT_DELAY = 30000;

  function getToken() {
    return window.state && window.state.accessToken
      ? window.state.accessToken
      : localStorage.getItem('absher_access_token') || '';
  }

  function getSocketUrl() {
    var api = window.API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
    return api.replace(/\/api\/v1\/?$/, '');
  }

  function connect() {
    var token = getToken();

    if (!token) {
      console.log('[Realtime] No JWT token');
      return;
    }

    if (socket && (socket.connected || socket.connecting)) {
      return;
    }

    if (typeof window.io !== 'function') {
      console.warn('[Realtime] Socket.IO client is not loaded');
      return;
    }

    socket = window.io(getSocketUrl() + '/notifications', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 10000
    });

    socket.on('connect', function () {
      reconnectDelay = 1000;

      console.log(
        '[Realtime] Connected:',
        socket.id
      );

      if (typeof window.toast === 'function') {
        window.toast('الإشعارات الفورية متصلة 🔔', 'success');
      }
    });

    socket.on('notification', function (notification) {
      console.log('[Realtime] Notification:', notification);

      handleNotification(notification);
    });

    socket.on('notification:count', function (data) {
      var count = Number(data && data.unreadCount) || 0;

      console.log('[Realtime] Unread:', count);

      updateUnreadCount(count);
    });

    socket.on('notification:error', function (error) {
      console.warn('[Realtime] Server error:', error);
    });

    socket.on('disconnect', function (reason) {
      console.warn('[Realtime] Disconnected:', reason);

      scheduleReconnect();
    });

    socket.on('connect_error', function (error) {
      console.warn(
        '[Realtime] Connection error:',
        error && error.message
      );

      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;

    if (!getToken()) return;

    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;

      reconnectDelay = Math.min(
        reconnectDelay * 2,
        MAX_RECONNECT_DELAY
      );

      connect();
    }, reconnectDelay);
  }

  function handleNotification(notification) {
    if (!notification) return;

    /*
     * تحديث عداد الإشعارات
     */
    var current = getCurrentUnreadCount();

    updateUnreadCount(
      notification.isRead === false
        ? current + 1
        : current
    );

    /*
     * الصوت والاهتزاز
     */
    if (typeof window.notifyWithFeedback === 'function') {
      window.notifyWithFeedback();
    } else {
      if (typeof window.playNotificationSound === 'function') {
        window.playNotificationSound();
      }

      if (typeof window.vibrateNotification === 'function') {
        window.vibrateNotification();
      }
    }

    /*
     * Toast
     */
    if (typeof window.toast === 'function') {
      var title = notification.title || 'إشعار جديد';
      var body = notification.body || '';

      window.toast(
        '🔔 ' + title + (body ? '\n' + body : ''),
        'info'
      );
    }

    /*
     * إذا صفحة الإشعارات مفتوحة، حدّث القائمة
     */
    if (
      typeof window.fetchUnreadCount === 'function'
    ) {
      window.fetchUnreadCount();
    }

    /*
     * إذا توجد دالة لإضافة الإشعار مباشرة للقائمة
     */
    if (
      typeof window.handleRealtimeNotification === 'function'
    ) {
      window.handleRealtimeNotification(notification);
    }
  }

  function getCurrentUnreadCount() {
    var badge = document.querySelector('#notifBadge');

    if (!badge) return 0;

    var value = parseInt(
      badge.textContent || '0',
      10
    );

    return Number.isFinite(value) ? value : 0;
  }

  function updateUnreadCount(count) {
    count = Math.max(
      0,
      Number(count) || 0
    );

    var badge = document.querySelector('#notifBadge');

    if (!badge) return;

    if (count > 0) {
      badge.textContent =
        count > 99 ? '99+' : String(count);

      badge.style.display = 'flex';
    } else {
      badge.textContent = '';
      badge.style.display = 'none';
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    console.log('[Realtime] Disconnected manually');
  }

  /*
   * عند تسجيل الدخول
   */
  window.addEventListener(
    'absher:login',
    function () {
      setTimeout(connect, 300);
    }
  );

  /*
   * عند تسجيل الخروج
   */
  window.addEventListener(
    'absher:logout',
    function () {
      disconnect();
    }
  );

  /*
   * إعادة الاتصال عند عودة الإنترنت
   */
  window.addEventListener(
    'online',
    function () {
      if (!socket || !socket.connected) {
        setTimeout(connect, 500);
      }
    }
  );

  /*
   * بدء تلقائي إذا كان المستخدم مسجلًا
   */
  function init() {
    setTimeout(function () {
      if (getToken()) {
        connect();
      }
    }, 1000);
  }

  /*
   * API عام
   */
  window.AbsherNotificationRealtime = {
    connect: connect,
    disconnect: disconnect,
    isConnected: function () {
      return !!(socket && socket.connected);
    },
    getSocket: function () {
      return socket;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();
