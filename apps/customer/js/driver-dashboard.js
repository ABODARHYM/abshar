/* ABSHER BI - driver-dashboard.js */
(function () {
  'use strict';

  function refresh() {
    var btn = document.getElementById('driverEntryBtn');
    if (!btn) return;

    var user = window.state && (window.state.user || window.state.profile);
    if (!user) {
      btn.style.display = 'none';
      return;
    }

    var roles = user.roles || [];
    var isDriver = roles.indexOf('driver') !== -1;

    btn.style.display = isDriver ? '' : 'none';
  }

  setInterval(refresh, 2000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.id === 'driverEntryBtn') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openDriverDashboard === 'function') {
          window.openDriverDashboard();
        }
        return;
      }
      t = t.parentNode;
    }
  }, true);
})();
