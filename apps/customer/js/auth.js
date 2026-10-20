/* ABSHER BI - auth.js */
(function () {
  'use strict';

  async function login(identifier, password) {
    showLoading('Logging in...');
    try {
      var data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier, password: password }),
      }, false);

      saveAuth(data);

      console.log('[login] state.accessToken:', state.accessToken ? 'YES' : 'NO');
      console.log('[login] state.user:', state.user ? state.user.email : 'NO');

      try {
        var me = await api('/auth/me');
        var meUser = me.user || me;

        if (meUser.roles) state.user.roles = meUser.roles;
        if (meUser.permissions) state.user.permissions = meUser.permissions;
        state.profile = state.user;
        localStorage.setItem(STORAGE.user, JSON.stringify(state.user));

        console.log('[login] Roles:', state.user.roles);
      } catch (e) {
        console.warn('[login] /auth/me failed:', e.message);
      }

      showApp();
      toast('مرحباً بك');
    } catch (error) {
      console.error('Login error:', error);
      message('loginMessage', humanError(error), 'error');
    } finally {
      hideLoading();
    }
  }

  async function register(fullName, email, phone, password) {
    showLoading('Creating account...');
    try {
      var data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fullName,
          email: email,
          phone: phone,
          password: password,
        }),
      }, false);

      saveAuth(data);

      try {
        var me = await api('/auth/me');
        var meUser = me.user || me;
        if (meUser.roles) state.user.roles = meUser.roles;
        if (meUser.permissions) state.user.permissions = meUser.permissions;
        state.profile = state.user;
        localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
      } catch (e) {
        console.warn('[register] /auth/me failed:', e.message);
      }

      showApp();
      toast('تم إنشاء الحساب');
    } catch (error) {
      console.error('Register error:', error);
      message('registerMessage', humanError(error), 'error');
    } finally {
      hideLoading();
    }
  }

  async function loadProfile() {
    var meRes = await api('/auth/me');
    var userFromMe = meRes.user || meRes;

    var profileRes = null;
    try {
      profileRes = await api('/profile');
    } catch (e) {
      console.warn('[loadProfile] /profile failed:', e.message);
    }

    var merged = {};
    if (profileRes) {
      for (var k in profileRes) {
        if (Object.prototype.hasOwnProperty.call(profileRes, k)) {
          merged[k] = profileRes[k];
        }
      }
    }
    merged.id = userFromMe.id;
    merged.email = userFromMe.email;
    merged.phone = userFromMe.phone;
    merged.fullName = userFromMe.fullName || merged.fullName;
    merged.status = userFromMe.status;
    merged.roles = userFromMe.roles || [];
    merged.permissions = userFromMe.permissions || [];

    state.user = merged;
    state.profile = merged;
    localStorage.setItem(STORAGE.user, JSON.stringify(merged));

    if (typeof renderProfile === 'function') renderProfile();
  }

  async function logout() {
    try {
      if (state.accessToken) {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        }, false);
      }
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      clearAuth();
      showPage('welcomePage');
      toast('تم تسجيل الخروج');
    }
  }

  function showApp() {
    showPage('appPage');
    showView('homeView');
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof updateCartBadge === 'function') updateCartBadge();
  }

  window.login = login;
  window.register = register;
  window.loadProfile = loadProfile;
  window.logout = logout;
  window.showApp = showApp;
})();
