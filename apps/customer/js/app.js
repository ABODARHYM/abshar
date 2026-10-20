/* ============================================================
   ABSHER BI — app.js
   ربط الأحداث + التهيئة
   ============================================================ */

function setupEvents() {
  /* Welcome */
  $('#goLogin')?.addEventListener('click', () => showPage('loginPage'));
  $('#goRegister')?.addEventListener('click', () => showPage('registerPage'));
  $('#backLogin')?.addEventListener('click', () => showPage('welcomePage'));
  $('#backRegister')?.addEventListener('click', () => showPage('welcomePage'));
  $('#registerFromLogin')?.addEventListener('click', () => {
    hideMessage('loginMessage');
    showPage('registerPage');
  });
  $('#loginFromRegister')?.addEventListener('click', () => {
    hideMessage('registerMessage');
    showPage('loginPage');
  });

  /* Login form */
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage('loginMessage');
    const identifier = $('#loginIdentifier').value.trim();
    const password   = $('#loginPassword').value;
    if (!identifier) return message('loginMessage', 'أدخل البريد الإلكتروني أو رقم الهاتف');
    if (!password)   return message('loginMessage', 'أدخل كلمة المرور');
    await login(identifier, password);
  });

  /* Register form */
  $('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage('registerMessage');
    const fullName = $('#registerFullName').value.trim();
    const email    = $('#registerEmail').value.trim();
    const phone    = $('#registerPhone').value.trim();
    const password = $('#registerPassword').value;
    if (!fullName || !email || !phone || !password) {
      return message('registerMessage', 'أكمل جميع البيانات');
    }
    if (password.length < 8) {
      return message('registerMessage', 'كلمة المرور 8 أحرف على الأقل');
    }
    await register(fullName, email, phone, password);
  });

  /* Logout */
  $('#logoutButton')?.addEventListener('click', logout);

  /* Bottom nav */
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => showView(item.dataset.view));
  });

  /* Services */
  $$('.service').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  /* Addresses */
  $('#addAddressButton')?.addEventListener('click', () => openAddressModal());
  $('#closeAddressModal')?.addEventListener('click', closeAddressModal);
  $('#addressForm')?.addEventListener('submit', submitAddress);

  /* Edit profile — فتح نافذة بسيطة عبر prompt (نحسّنها لاحقًا) */
  $('#editProfileButton')?.addEventListener('click', async () => {
    const current = state.profile?.fullName || state.user?.fullName || '';
    const newName = prompt('الاسم الكامل الجديد:', current);
    if (!newName || newName.trim() === current) return;
    await updateProfile(newName.trim());
  });

  /* Checkout */
  $('#checkoutButton')?.addEventListener('click', () => {
    openCheckout();
  });

  /* Search — يفلتر البطاقات المعروضة */
  $('#searchInput')?.addEventListener('input', (e) => {
    const v = e.target.value.trim().toLowerCase();
    $$('.store-card, .product-card').forEach(card => {
      card.style.display = !v || card.textContent.toLowerCase().includes(v) ? '' : 'none';
    });
  });
}

async function initialize() {
  setupEvents();
  updateCartBadge();

  // محاولة استعادة الجلسة
  const stored = loadStoredUser();
  if (stored) state.user = stored;

  if (state.accessToken) {
    try {
      showLoading('جاري التحقق من الحساب...');
      await loadProfile();
      showApp();

      // بدء polling الإشعارات
      if (typeof startNotificationPolling === 'function') {
        fetchUnreadCount();
        startNotificationPolling();
      }

      return;
    } catch (e) {
      console.warn('Stored session invalid:', e);
      clearAuth();
    } finally {
      hideLoading();
    }
  }
  showPage('welcomePage');
}

document.addEventListener('DOMContentLoaded', initialize);

/* ═══════════════════════════════════════════════════════════
   PWA — Service Worker
   ═══════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    false && navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('[PWA] SW registered:', reg.scope))
      .catch((err) => console.warn('[PWA] SW registration failed:', err));
  });
}

/* مؤشر offline/online */
window.addEventListener('online', () => toast('عدت للاتصال 🌐', 'success'));
window.addEventListener('offline', () => toast('لا يوجد اتصال 📴', 'error'));



/* ═══════════════════════════════════════════════════════════
   STORE OWNER ENTRY
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function refresh() {
    var btn = document.getElementById('soEntryBtn');
    if (!btn) return;

    var user = window.state && (window.state.user || window.state.profile);
    if (!user) {
      btn.style.display = 'none';
      return;
    }

    var roles = user.roles || [];
    var isOwner =
      roles.indexOf('storeOwner') !== -1 ||
      roles.indexOf('storeManager') !== -1;

    btn.style.display = isOwner ? '' : 'none';
  }

  // راقب كل 400ms
  setInterval(refresh, 2000);

  // عند التحميل
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  // عند الضغط — استخدم التقاط الحدث لمنع التداخل
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.id === 'soEntryBtn') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openStoreDashboard === 'function') {
          window.openStoreDashboard();
        } else {
          console.error('[SO] openStoreDashboard not defined');
        }
        return;
      }
      t = t.parentNode;
    }
  }, true);

  console.log('[SO] Store owner entry ready');
})();


/* ═══════════════════════════════════════════════════════════
   PWA — Service Worker + Online/Offline
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // تسجيل Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('./sw.js')
        .then(function (reg) {
          console.log('[PWA] SW registered:', reg.scope);
        })
        .catch(function (err) {
          console.warn('[PWA] SW registration failed:', err);
        });
    });
  }

  // مؤشر online/offline
  window.addEventListener('online', function () {
    if (typeof toast === 'function') toast('عدت للاتصال \uD83C\uDF10', 'success');
  });

  window.addEventListener('offline', function () {
    if (typeof toast === 'function') toast('لا يوجد اتصال \uD83D\uDCF4', 'error');
  });
})();
