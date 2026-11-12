/* ABSHER BI - state.js */
(function () {
  'use strict';

  // STORAGE معرّف في config.js

  var state = {
    user: null,
    profile: null,
    accessToken: localStorage.getItem(STORAGE.accessToken) || '',
    refreshToken: localStorage.getItem(STORAGE.refreshToken) || '',
    addresses: [],
    cart: JSON.parse(localStorage.getItem(STORAGE.cart) || '[]'),
  };

  function saveAuth(data) {
    if (!data) return;

    if (data.tokens) {
      if (data.tokens.accessToken) {
        state.accessToken = data.tokens.accessToken;
        localStorage.setItem(STORAGE.accessToken, state.accessToken);
        console.log('[saveAuth] accessToken saved:', state.accessToken.substring(0, 30) + '...');
      }
      if (data.tokens.refreshToken) {
        state.refreshToken = data.tokens.refreshToken;
        localStorage.setItem(STORAGE.refreshToken, state.refreshToken);
      }
    }

    if (data.user) {
      state.user = data.user;
      state.profile = data.user;
      localStorage.setItem(STORAGE.user, JSON.stringify(data.user));
      console.log('[saveAuth] user saved:', data.user.email);
    }
  }

  function clearAuth() {
    state.user = null;
    state.profile = null;
    state.accessToken = '';
    state.refreshToken = '';
    state.addresses = [];
    localStorage.removeItem(STORAGE.accessToken);
    localStorage.removeItem(STORAGE.refreshToken);
    localStorage.removeItem(STORAGE.user);
  }

  function loadStoredUser() {
    var raw = localStorage.getItem(STORAGE.user);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  window.state = state;
  window.saveAuth = saveAuth;
  window.clearAuth = clearAuth;
  window.loadStoredUser = loadStoredUser;
})();
