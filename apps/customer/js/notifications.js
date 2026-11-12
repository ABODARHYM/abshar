/* ============================================================
   ABSHER BI — notifications.js
   نظام إشعارات احترافي كامل
   ============================================================ */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  State
  // ═══════════════════════════════════════════════════════════
  var state = {
    items: [],
    unreadCount: 0,
    total: 0,
    filter: 'all',          // all | unread
    loading: false,
    pollInterval: null,
    pollDelay: 30000,       // 30 ثانية
    lastFetch: 0,
  };

  // ═══════════════════════════════════════════════════════════
  //  Icons Map
  // ═══════════════════════════════════════════════════════════
  var ICONS = {
    ORDER_CREATED:       { emoji: '\uD83D\uDCE6', color: 'info' },
    ORDER_ACCEPTED:      { emoji: '\u2705',       color: 'success' },
    ORDER_REJECTED:      { emoji: '\u274C',       color: 'danger' },
    ORDER_PREPARING:     { emoji: '\uD83D\uDC68\u200D\uD83C\uDF73', color: 'info' },
    ORDER_READY:         { emoji: '\uD83D\uDD14', color: 'warning' },
    DRIVER_ASSIGNED:     { emoji: '\uD83D\uDEF5', color: 'info' },
    DRIVER_PICKED_UP:    { emoji: '\uD83D\uDCE6', color: 'info' },
    DRIVER_ARRIVED:      { emoji: '\uD83D\uDCCD', color: 'info' },
    ORDER_DELIVERED:     { emoji: '\uD83C\uDF89', color: 'success' },
    ORDER_CANCELLED:     { emoji: '\u26D4',       color: 'danger' },
    PROMOTION:           { emoji: '\uD83C\uDF81', color: 'warning' },
    SYSTEM:              { emoji: '\u2139\uFE0F', color: 'info' },
    SUPPORT:             { emoji: '\uD83D\uDCAC', color: 'info' },
  };

  // ═══════════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════════

  async function openNotifications() {
    // اذهب لصفحة الإشعارات
    if (typeof window.showView === 'function') {
      window.showView('notificationsView');
    }

    // رسم الـ skeleton
    var container = document.querySelector('#notificationsContent');
    if (container) {
      container.innerHTML = buildSkeleton();
    }

    // حمّل الإشعارات
    await fetchNotifications();

    // شغّل polling
    startPolling();
  }

  async function fetchNotifications() {
    if (state.loading) return;
    state.loading = true;

    var container = document.querySelector('#notificationsContent');
    if (!container) {
      state.loading = false;
      return;
    }

    try {
      var params = 'limit=50';
      if (state.filter === 'unread') params += '&unreadOnly=true';

      var res = await window.api('/notifications?' + params);

      state.items = res.items || [];
      state.unreadCount = res.unreadCount || 0;
      state.total = res.meta ? res.meta.total : state.items.length;
      state.lastFetch = Date.now();

      render();
      updateBadge();
    } catch (err) {
      console.error('[notifications] fetch error:', err);
      renderError(err);
    } finally {
      state.loading = false;
    }
  }

  async function fetchUnreadCount() {
    if (!window.state || !window.state.accessToken) return;
    try {
      var res = await window.api('/notifications/unread-count');
      state.unreadCount = res.unreadCount || 0;
      updateBadge();
    } catch (err) {
      // silent
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  function render() {
    var container = document.querySelector('#notificationsContent');
    if (!container) return;

    var html = '';

    // Filters + Actions
    html += '<div class="notif-toolbar">';
    html += '  <div class="so-filters" style="margin:0">';
    html += '    <button class="so-filter ' + (state.filter === 'all' ? 'active' : '') + '" type="button" onclick="notifSetFilter(\'all\')">';
    html += '      \uD83D\uDCE5 الكل (' + state.total + ')';
    html += '    </button>';
    html += '    <button class="so-filter ' + (state.filter === 'unread' ? 'active' : '') + '" type="button" onclick="notifSetFilter(\'unread\')">';
    html += '      \uD83D\uDD34 غير مقروء (' + state.unreadCount + ')';
    html += '    </button>';
    html += '  </div>';

    if (state.unreadCount > 0) {
      html += '  <button class="notif-mark-all" type="button" onclick="notifMarkAllRead()" title="تعليم الكل">';
      html += '    \u2713 الكل';
      html += '  </button>';
    }
    html += '</div>';

    // List
    if (state.items.length === 0) {
      html += renderEmpty();
    } else {
      html += '<div class="notif-list">';
      for (var i = 0; i < state.items.length; i++) {
        html += renderItem(state.items[i]);
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }

  function renderItem(n) {
    var meta = ICONS[n.type] || { emoji: '\uD83D\uDD14', color: 'info' };
    var unread = !n.isRead ? ' unread' : '';
    var dataAttr = n.data ? encodeURIComponent(JSON.stringify(n.data)) : '';

    return [
      '<div class="notif-item' + unread + '" data-id="' + n.id + '" onclick="notifOnClick(\'' + n.id + '\')">',
        '<div class="notif-item-icon notif-' + meta.color + '">' + meta.emoji + '</div>',
        '<div class="notif-item-body">',
          '<div class="notif-item-title">' + escapeHtml(n.title) + '</div>',
          '<div class="notif-item-text">' + escapeHtml(n.body) + '</div>',
          '<div class="notif-item-time">' + timeAgo(n.createdAt) + '</div>',
        '</div>',
        !n.isRead ? '<div class="notif-item-dot"></div>' : '',
      '</div>',
    ].join('');
  }

  function renderEmpty() {
    var title = state.filter === 'unread'
      ? 'لا توجد إشعارات غير مقروءة'
      : 'لا توجد إشعارات';
    return [
      '<div class="notif-empty">',
        '<div class="notif-empty-icon">\uD83D\uDD14</div>',
        '<h3>' + title + '</h3>',
        '<p>ستظهر هنا كل تحديثات طلباتك وحسابك</p>',
      '</div>',
    ].join('');
  }

  function renderError(err) {
    var container = document.querySelector('#notificationsContent');
    if (!container) return;

    container.innerHTML = [
      '<div class="notif-empty">',
        '<div class="notif-empty-icon">\u26A0\uFE0F</div>',
        '<h3>تعذر تحميل الإشعارات</h3>',
        '<p>' + escapeHtml(humanError(err)) + '</p>',
        '<button class="btn btn-secondary" type="button" onclick="notifReload()">\uD83D\uDD04 إعادة المحاولة</button>',
      '</div>',
    ].join('');
  }

  function buildSkeleton() {
    var items = '';
    for (var i = 0; i < 5; i++) {
      items += [
        '<div class="notif-skeleton-item">',
          '<div class="notif-skeleton-icon"></div>',
          '<div style="flex:1">',
            '<div class="notif-skeleton-line" style="width:70%"></div>',
            '<div class="notif-skeleton-line" style="width:90%"></div>',
            '<div class="notif-skeleton-line" style="width:30%"></div>',
          '</div>',
        '</div>',
      ].join('');
    }
    return '<div class="notif-list">' + items + '</div>';
  }

  // ═══════════════════════════════════════════════════════════
  //  Actions
  // ═══════════════════════════════════════════════════════════

  function setFilter(filter) {
    if (state.filter === filter) return;
    state.filter = filter;

    // skeleton
    var container = document.querySelector('#notificationsContent');
    if (container) container.innerHTML = buildSkeleton();

    fetchNotifications();
  }

  async function markAllRead() {
    if (state.unreadCount === 0) return;

    try {
      await window.api('/notifications/read-all', { method: 'PATCH' });

      for (var i = 0; i < state.items.length; i++) {
        state.items[i].isRead = true;
      }
      state.unreadCount = 0;

      render();
      updateBadge();

      if (typeof window.toast === 'function') {
        window.toast('تم تعليم الكل كمقروء');
      }
    } catch (err) {
      console.error('[notifications] mark all error:', err);
      if (typeof window.toast === 'function') {
        window.toast(humanError(err), 'error');
      }
    }
  }

  async function onClick(id) {
    var n = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) { n = state.items[i]; break; }
    }
    if (!n) return;

    // علّم كمقروء
    if (!n.isRead) {
      try {
        await window.api('/notifications/' + id + '/read', { method: 'PATCH' });
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        updateBadge();

        // حدّث العنصر في الواجهة
        var el = document.querySelector('.notif-item[data-id="' + id + '"]');
        if (el) {
          el.classList.remove('unread');
          var dot = el.querySelector('.notif-item-dot');
          if (dot) dot.remove();
        }
      } catch (err) {
        console.warn('[notifications] mark read failed:', err);
      }
    }

    // انتقل للطلب إذا كان موجودًا
    if (n.data && n.data.orderNumber) {
      navigateToOrder(n);
    }
  }

  async function navigateToOrder(n) {
    // حدد الوجهة حسب الدور
    var user = window.state && window.state.user;
    if (!user) return;

    var roles = user.roles || [];

    if (roles.indexOf('driver') !== -1) {
      // المندوب → توصيلاتي
      if (typeof window.showView === 'function') window.showView('driverDashboardView');
      if (typeof window.openDriverDashboard === 'function') window.openDriverDashboard();
    } else if (roles.indexOf('storeOwner') !== -1 || roles.indexOf('storeManager') !== -1) {
      // صاحب المتجر → طلبات المتجر
      if (typeof window.showView === 'function') window.showView('soOrdersView');
      if (typeof window.loadStoreOrders === 'function') window.loadStoreOrders();
    } else if (roles.indexOf('admin') !== -1 || roles.indexOf('superAdmin') !== -1) {
      // الإدارة → admin orders
      if (typeof window.showView === 'function') window.showView('adminDashboardView');
      if (typeof window.adminSwitchTab === 'function') window.adminSwitchTab('orders');
    } else {
      // العميل → طلباتي
      if (typeof window.showView === 'function') window.showView('ordersView');
      if (typeof window.loadOrders === 'function') window.loadOrders();
    }
  }

  function reload() {
    var container = document.querySelector('#notificationsContent');
    if (container) container.innerHTML = buildSkeleton();
    fetchNotifications();
  }

  // ═══════════════════════════════════════════════════════════
  //  Badge (الشارة الحمراء)
  // ═══════════════════════════════════════════════════════════

  function updateBadge() {
    var badge = document.querySelector('#notifBadge');
    if (!badge) return;

    if (state.unreadCount > 0) {
      badge.textContent = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Polling
  // ═══════════════════════════════════════════════════════════

  function startPolling() {
    stopPolling();
    state.pollInterval = setInterval(function () {
      // توقف إذا خارج الصفحة
      var view = document.querySelector('#notificationsView');
      if (!view || view.classList.contains('hidden')) {
        stopPolling();
        return;
      }
      fetchNotifications();
    }, state.pollDelay);
  }

  function stopPolling() {
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Badge polling — يعمل دائمًا في الخلفية
  // ═══════════════════════════════════════════════════════════

  var badgePollInterval = null;

  function startBadgePolling() {
    if (badgePollInterval) return;
    badgePollInterval = setInterval(function () {
      if (window.state && window.state.accessToken) {
        fetchUnreadCount();
      }
    }, 60000); // كل دقيقة
  }

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(s) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(s);
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function timeAgo(iso) {
    try {
      var d = new Date(iso);
      var diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return 'الآن';
      if (diff < 3600) return 'قبل ' + Math.floor(diff / 60) + ' دقيقة';
      if (diff < 86400) return 'قبل ' + Math.floor(diff / 3600) + ' ساعة';
      if (diff < 604800) return 'قبل ' + Math.floor(diff / 86400) + ' يوم';
      return d.toLocaleDateString('ar-YE');
    } catch (e) {
      return '';
    }
  }

  function humanError(err) {
    if (typeof window.humanError === 'function') return window.humanError(err);
    return (err && err.message) || 'حدث خطأ';
  }

  // ═══════════════════════════════════════════════════════════
  //  Auto-init
  // ═══════════════════════════════════════════════════════════

  // ابدأ badge polling بعد تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        fetchUnreadCount();
        startBadgePolling();
      }, 2000);
    });
  } else {
    setTimeout(function () {
      fetchUnreadCount();
      startBadgePolling();
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════
  //  Expose to window
  // ═══════════════════════════════════════════════════════════

  window.openNotifications = openNotifications;
  window.notifSetFilter = setFilter;
  window.notifMarkAllRead = markAllRead;
  window.notifOnClick = onClick;
  window.notifReload = reload;
  window.fetchUnreadCount = fetchUnreadCount;
  window.updateNotificationBadge = updateBadge;
  window.startNotificationPolling = startBadgePolling;

})();
