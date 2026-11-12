/* ============================================================
   ABSHER BI - pull-refresh.js
   Pull-to-refresh + زر العودة للأعلى
   ============================================================ */

(function () {
  'use strict';

  var startY = 0;
  var currentY = 0;
  var pulling = false;
  var threshold = 80;
  var indicator = null;
  var container = null;

  function getActiveView() {
    var views = document.querySelectorAll('.view:not(.hidden)');
    return views.length > 0 ? views[0] : null;
  }

  function ensureIndicator() {
    if (indicator) return indicator;

    indicator = document.createElement('div');
    indicator.id = 'pullIndicator';
    indicator.className = 'pull-indicator';
    indicator.innerHTML = [
      '<div class="pull-spinner">',
        '<svg viewBox="0 0 50 50" width="28" height="28">',
          '<circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" ',
          'stroke-linecap="round" stroke-dasharray="1, 150" stroke-dashoffset="0">',
          '</circle>',
        '</svg>',
      '</div>',
      '<span class="pull-text">اسحب للتحديث</span>',
    ].join('');
    document.body.appendChild(indicator);
    return indicator;
  }

  function shouldEnable() {
    var view = getActiveView();
    if (!view) return false;
    // تفعيل في الصفحات الرئيسية فقط
    var enabledViews = [
      'homeView', 'storesView', 'ordersView', 'favoritesView',
      'addressesView', 'cartView', 'storeDashboardView',
      'soOrdersView', 'soProductsView', 'soCategoriesView',
      'driverDashboardView', 'adminDashboardView',
    ];
    return enabledViews.indexOf(view.id) !== -1;
  }

  function onTouchStart(e) {
    if (!shouldEnable()) return;
    if (window.scrollY > 5) return;

    startY = e.touches[0].clientY;
    pulling = true;

    ensureIndicator();
    indicator.classList.remove('active', 'ready');
    indicator.style.transform = 'translateY(-100px)';
  }

  function onTouchMove(e) {
    if (!pulling) return;
    currentY = e.touches[0].clientY;
    var diff = currentY - startY;

    if (diff > 0 && window.scrollY <= 5) {
      e.preventDefault();
      var distance = Math.min(diff * 0.5, 140);

      indicator.style.transform = 'translateY(' + (distance - 100) + 'px)';

      if (distance >= threshold) {
        indicator.classList.add('ready');
        indicator.querySelector('.pull-text').textContent = 'أفلت للتحديث';
      } else {
        indicator.classList.remove('ready');
        indicator.querySelector('.pull-text').textContent = 'اسحب للتحديث';
      }
    }
  }

  function onTouchEnd() {
    if (!pulling) return;
    pulling = false;

    if (!indicator) return;

    var distance = currentY - startY;
    if (distance * 0.5 >= threshold) {
      // فعّل التحديث
      indicator.classList.add('active');
      indicator.querySelector('.pull-text').textContent = 'جاري التحديث...';
      indicator.querySelector('.pull-spinner').classList.add('spinning');

      doRefresh();
    } else {
      indicator.classList.remove('active', 'ready');
      indicator.style.transform = 'translateY(-100px)';
    }

    startY = 0;
    currentY = 0;
  }

  async function doRefresh() {
    try {
      var view = getActiveView();
      if (!view) return;

      var viewId = view.id;

      // استدعِ الدالة المناسبة
      if (viewId === 'homeView' && typeof loadProfile === 'function') {
        await loadProfile();
      }
      if (viewId === 'storesView' && typeof loadStores === 'function') {
        await loadCategories();
        await loadStores();
      }
      if (viewId === 'ordersView' && typeof loadOrders === 'function') {
        await loadOrders();
      }
      if (viewId === 'addressesView' && typeof loadAddresses === 'function') {
        await loadAddresses();
      }
      if (viewId === 'storeDashboardView' && typeof openStoreDashboard === 'function') {
        await openStoreDashboard();
      }
      if (viewId === 'soOrdersView' && typeof loadStoreOrders === 'function') {
        await loadStoreOrders();
      }
      if (viewId === 'soProductsView' && typeof loadStoreProducts === 'function') {
        await loadStoreProducts();
      }
      if (viewId === 'soCategoriesView' && typeof loadStoreCategories === 'function') {
        await loadStoreCategories();
      }
      if (viewId === 'driverDashboardView' && typeof openDriverDashboard === 'function') {
        await openDriverDashboard();
      }
      if (viewId === 'adminDashboardView' && typeof openAdminDashboard === 'function') {
        await openAdminDashboard();
      }

      toast('تم التحديث');
    } catch (e) {
      console.error('Pull refresh error:', e);
      toast('تعذر التحديث', 'error');
    } finally {
      setTimeout(function () {
        if (indicator) {
          indicator.classList.remove('active', 'ready');
          indicator.style.transform = 'translateY(-100px)';
          indicator.querySelector('.pull-spinner')?.classList.remove('spinning');
        }
      }, 400);
    }
  }

  // ═══ ربط الأحداث ═══
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });

  // ═══ زر العودة للأعلى ═══
  function initScrollTopBtn() {
    var btn = document.createElement('button');
    btn.id = 'scrollTopBtn';
    btn.className = 'scroll-top-btn';
    btn.type = 'button';
    btn.innerHTML = '\u2191';
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    window.addEventListener('scroll', function () {
      if (window.scrollY > 500) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollTopBtn);
  } else {
    initScrollTopBtn();
  }
})();
