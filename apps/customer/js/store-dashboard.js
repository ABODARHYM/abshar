/* ABSHER BI - store-dashboard.js
   مسؤول فقط عن إظهار زر "متجري"
   فتح لوحة المتجر يتم من app.js فقط
*/
(function () {
  'use strict';

  function update() {
    var btn = document.getElementById('soEntryBtn');
    if (!btn) return;

    var user =
      window.state &&
      (window.state.user || window.state.profile);

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

  function init() {
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.refreshStoreEntryButton = update;

  console.log('[SO] Store entry button ready');
})();
