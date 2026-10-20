/* ABSHER BI - admin-dashboard.js */
(function () {
  'use strict';

  function refresh() {
    var btn = document.getElementById('adminEntryBtn');
    if (!btn) return;

    var user = window.state && (window.state.user || window.state.profile);
    if (!user) {
      btn.style.display = 'none';
      return;
    }

    var roles = user.roles || [];
    var isAdmin =
      roles.indexOf('admin') !== -1 ||
      roles.indexOf('superAdmin') !== -1;

    btn.style.display = isAdmin ? '' : 'none';
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
      if (t.id === 'adminEntryBtn') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openAdminDashboard === 'function') {
          window.openAdminDashboard();
        }
        return;
      }
      t = t.parentNode;
    }
  }, true);
})();
