/* ============================================================
   ABSHER BI — profile.js
   عرض الملف الشخصي + نافذة التعديل + تغيير كلمة المرور
   ============================================================ */

function renderProfile() {
  const user = state.user || state.profile;
  if (!user) return;

  const fullName = user.fullName || user.full_name || 'مستخدم أبشر بي';
  const email    = user.email || 'لا يوجد بريد';
  const phone    = user.phone || '';
  const roles    = user.roles || [];

  $('#homeName').textContent      = fullName;
  $('#profileName').textContent   = fullName;
  $('#profileEmail').textContent  = email;
  $('#profilePhone').textContent  = phone ? '📱 ' + phone : '';
  $('#profileRole').textContent   = roles.length ? 'الدور: ' + roles.join('، ') : 'عميل';

  const first = fullName.trim().charAt(0) || 'أ';
  $('#profileAvatar').textContent = first;
}

async function updateProfile(fullName, phone) {
  try {
    const payload = {};
    if (fullName) payload.fullName = fullName;
    if (phone)    payload.phone = phone;
    const updated = await api('/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    state.profile = updated;
    state.user = { ...(state.user || {}), ...updated };
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    renderProfile();
    toast('تم تحديث الملف الشخصي');
  } catch (error) {
    console.error('Update profile error:', error);
    toast(humanError(error), 'error');
    throw error;
  }
}

async function changePassword(currentPassword, newPassword) {
  try {
    const res = await api('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    toast('تم تغيير كلمة المرور. يرجى تسجيل الدخول من جديد');
    // السيرفر يبطل كل الجلسات؛ نطرد المستخدم
    clearAuth();
    setTimeout(() => showPage('welcomePage'), 1200);
    return res;
  } catch (error) {
    console.error('Change password error:', error);
    toast(humanError(error), 'error');
    throw error;
  }
}
