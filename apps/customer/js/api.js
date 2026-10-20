/* ============================================================
   ABSHER BI — api.js
   عميل HTTP + تجديد التوكن تلقائيًا
   ============================================================ */

function humanError(error) {
  // أولوية: code من السيرفر → رسالة عربية موحّدة
  const code = error?.data?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error?.data?.message) return error.data.message;
  if (error?.message) return error.message;
  return 'حدث خطأ غير متوقع';
}

async function api(path, options = {}, retry = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;

  let response;
  try {
    response = await fetch(API_BASE_URL + path, { ...options, headers });
  } catch (networkErr) {
    const e = new Error(ERROR_MESSAGES.NETWORK_ERROR);
    e.status = 0;
    e.data = { code: 'NETWORK_ERROR' };
    throw e;
  }

  // تجديد تلقائي عند 401
  if (response.status === 401 && retry && state.refreshToken) {
    const ok = await refreshAccessToken();
    if (ok) return api(path, options, false);
  }

  let data = null;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function refreshAccessToken() {
  if (!state.refreshToken) return false;
  try {
    const response = await fetch(API_BASE_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });
    if (!response.ok) { clearAuth(); return false; }
    const data = await response.json();
    saveAuth(data);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}
