/* ============================================================
   ABSHER BI - ui.js
   أدوات الواجهة: toast, loading, message, تنقل, animations
   ============================================================ */

var $ = function (sel) {
  return document.querySelector(sel);
};

var $$ = function (sel) {
  return document.querySelectorAll(sel);
};


/* =========================
   Loading
   ========================= */

function showLoading(text) {
  var t = text || 'جاري التحميل...';

  var loadingText = $('#loadingText');
  if (loadingText) {
    loadingText.textContent = t;
  }

  var el = $('#loading');
  if (el) {
    el.classList.remove('hidden');
  }
}

function hideLoading() {
  var el = $('#loading');

  if (el) {
    el.classList.add('hidden');
  }
}


/* =========================
   Toast
   ========================= */

function toast(message, type) {
  var el = $('#toast');

  if (!el) return;

  el.textContent = message;
  el.className = 'toast ' + (type || 'success') + ' show';

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(function () {
    el.classList.remove('show');
  }, 3500);
}


/* =========================
   Messages
   ========================= */

function message(elementId, text, type) {
  var el = document.getElementById(elementId);

  if (!el) return;

  el.textContent = text;
  el.className = 'message ' + (type || 'error');
}

function hideMessage(elementId) {
  var el = document.getElementById(elementId);

  if (!el) return;

  el.textContent = '';
  el.className = 'message hidden';
}


/* =========================
   Pages
   ========================= */

function showPage(pageId) {
  $$('.page').forEach(function (p) {
    p.classList.add('hidden');
  });

  var page = document.getElementById(pageId);

  if (!page) return;

  page.classList.remove('hidden');

  page.style.animation = 'none';

  void page.offsetHeight;

  page.style.animation = '';

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================
   Views
   ========================= */

function showView(viewId) {
  var previous = document.querySelector('.view:not(.hidden)');
  var previousId = previous ? previous.id : null;

  $$('.view').forEach(function (v) {
    v.classList.add('hidden');
  });

  var view = document.getElementById(viewId);

  if (!view) return;

  view.classList.remove('hidden');

  view.classList.add('view-enter');

  view.classList.remove(
    'view-slide-forward',
    'view-slide-backward'
  );

  $$('.nav-item').forEach(function (item) {
    item.classList.toggle(
      'active',
      item.dataset.view === viewId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  /* =========================
     الصفحة الرئيسية
     ========================= */

  if (viewId === 'homeView') {
    if (typeof window.loadHome === 'function') {
      window.loadHome();
    }
  }


  /* =========================
     العناوين
     ========================= */

  if (viewId === 'addressesView') {
    if (typeof window.loadAddresses === 'function') {
      window.loadAddresses();
    }
  }


  /* =========================
     السلة
     ========================= */

  if (viewId === 'cartView') {
    if (typeof window.renderCart === 'function') {
      window.renderCart();
    }
  }


  /* =========================
     الطلبات
     ========================= */

  if (viewId === 'ordersView') {
    if (typeof window.loadOrders === 'function') {
      window.loadOrders();
    }
  }


  /* =========================
     المتاجر
     ========================= */

  if (viewId === 'storesView') {
    if (typeof window.loadCategories === 'function') {
      window.loadCategories();
    }

    if (typeof window.loadStores === 'function') {
      window.loadStores();
    }
  }


  /* =========================
     طلبات صاحب المتجر
     ========================= */

  if (viewId === 'soOrdersView') {
    if (typeof window.loadStoreOrders === 'function') {
      window.loadStoreOrders();
    }
  }


  /* =========================
     منتجات صاحب المتجر
     ========================= */

  if (viewId === 'soProductsView') {
    if (typeof window.loadStoreProducts === 'function') {
      window.loadStoreProducts();
    }
  }


  /* =========================
     تصنيفات صاحب المتجر
     ========================= */

  if (viewId === 'soCategoriesView') {
    if (typeof window.loadStoreCategories === 'function') {
      window.loadStoreCategories();
    }
  }


  /*
   * مهم جداً:
   *
   * لا نضع هنا:
   *
   * openDriverDashboard()
   * openStoreDashboard()
   * openAdminDashboard()
   *
   * لأن هذه الدوال نفسها تستخدم showView()
   * وهذا يسبب Loop / Recursion.
   *
   * فتح لوحات التحكم يتم من أزرار الدخول
   * الخاصة بها فقط.
   */
}


/* =========================
   Format Price
   ========================= */

function formatPrice(value) {
  return Number(value || 0).toLocaleString('ar-YE') + ' ريال';
}


/* =========================
   Escape HTML
   ========================= */

function escapeHtml(value) {
  return String(
    value === null || value === undefined ? '' : value
  )
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
