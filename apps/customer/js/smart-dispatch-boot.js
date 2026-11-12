/* ============================================================
   ABSHER BI - Smart Dispatch Boot
   تشغيل مستقل ومضمون لنظام عروض التوصيل الذكية
   ============================================================ */

(function () {
  'use strict';

  var started = false;
  var timer = null;

  function get(id) {
    return document.getElementById(id);
  }

  function getUser() {
    if (window.state) {
      return window.state.user || window.state.profile || null;
    }

    return null;
  }

  function getDriverProfile() {
    if (window.driverState && window.driverState.profile) {
      return window.driverState.profile;
    }

    return null;
  }

  function isDriver() {
    var user = getUser();

    if (user && Array.isArray(user.roles)) {
      if (
        user.roles.indexOf('driver') !== -1 ||
        user.roles.indexOf('delivery_driver') !== -1 ||
        user.roles.indexOf('courier') !== -1
      ) {
        return true;
      }
    }

    var profile = getDriverProfile();

    if (profile) {
      return true;
    }

    return false;
  }

  function ensureSection() {
    var parent = get('driverDashboardContent');

    if (!parent) {
      return false;
    }

    var existing = get('driverDispatchView');

    if (existing) {
      existing.style.display = 'block';
      existing.style.visibility = 'visible';
      existing.style.opacity = '1';
      existing.style.position = 'relative';
      existing.style.zIndex = '10';
      return true;
    }

    var section = document.createElement('section');

    section.id = 'driverDispatchView';
    section.className = 'driver-dispatch-section';

    section.style.display = 'block';
    section.style.visibility = 'visible';
    section.style.opacity = '1';
    section.style.position = 'relative';
    section.style.zIndex = '10';
    section.style.width = '100%';
    section.style.boxSizing = 'border-box';
    section.style.margin = '0 0 24px 0';

    section.innerHTML = [
      '<div class="dispatch-header">',
        '<div>',
          '<span class="dispatch-kicker">SMART DISPATCH</span>',
          '<h2>عروض التوصيل</h2>',
          '<p>طلبات قريبة منك يتم توزيعها عليك تلقائيًا.</p>',
        '</div>',
        '<div class="dispatch-live">',
          '<span></span>',
          'مباشر',
        '</div>',
      '</div>',

      '<div id="dispatchMessage" class="dispatch-message hidden"></div>',

      '<div id="dispatchOffers">',
        '<div class="dispatch-empty">',
          '<div class="dispatch-empty-icon">🚚</div>',
          '<strong>جاري البحث عن عروض توصيل</strong>',
          '<p>سيظهر الطلب الجديد هنا فور توفره.</p>',
        '</div>',
      '</div>'
    ].join('');

    parent.insertBefore(section, parent.firstChild);

    return true;
  }

  function start() {
    if (started) {
      return;
    }

    if (!isDriver()) {
      return;
    }

    if (!ensureSection()) {
      return;
    }

    started = true;

    if (
      typeof window.startSmartDispatch === 'function'
    ) {
      try {
        var result = window.startSmartDispatch();

        if (
          result &&
          typeof result.catch === 'function'
        ) {
          result.catch(function (error) {
            console.warn(
              '[SmartDispatch Boot] start failed:',
              error
            );
          });
        }
      } catch (error) {
        console.warn(
          '[SmartDispatch Boot] start error:',
          error
        );
      }
    } else {
      console.warn(
        '[SmartDispatch Boot] startSmartDispatch غير متاح'
      );
    }

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    console.log(
      '[SmartDispatch Boot] Smart Dispatch initialized'
    );
  }

  function watch() {
    start();

    if (started && timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function init() {
    watch();

    if (!started) {
      timer = setInterval(watch, 500);
    }
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.startSmartDispatchBoot = start;

})();
