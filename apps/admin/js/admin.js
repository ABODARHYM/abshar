/* ============================================================
   ABSHER BI - admin.js
   لوحة الإدارة: إحصائيات، مستخدمون، متاجر، مندوبون، طلبات، audit
   ============================================================ */

var adminState = {
  dashboard: null,
  users: [],
  stores: [],
  drivers: [],
  orders: [],
  auditLogs: [],
  roles: [],
  currentTab: 'overview',
  currentOrderFilter: null,
  currentUserFilter: null,
  poll: null,
};

// ═══════════════════════════════════════════════════════════════
//  1) فتح اللوحة
// ═══════════════════════════════════════════════════════════════

async function openAdminDashboard() {
  if (adminState.poll) {
    clearInterval(adminState.poll);
    adminState.poll = null;
  }

  showView('adminDashboardView');
  var el = document.querySelector('#adminDashboardContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    var dashboard = await api('/admin/dashboard');
    adminState.dashboard = dashboard;

    var roles = await api('/admin/roles');
    adminState.roles = roles || [];

    renderAdminDashboard();
    adminLoadTab('overview');
  } catch (e) {
    console.error('Open admin dashboard error:', e);
    el.innerHTML = [
      '<div class="empty">',
      '<div class="empty-icon">&#x26A0;&#xFE0F;</div>',
      '<strong>تعذر فتح لوحة الإدارة</strong>',
      '<p>' + escapeHtml(humanError(e)) + '</p>',
      '</div>'
    ].join('');
  }
}

function renderAdminDashboard() {
  var el = document.querySelector('#adminDashboardContent');
  if (!el) return;
  var d = adminState.dashboard;
  if (!d) return;

  el.innerHTML = [
    '<section class="admin-header">',
      '<div>',
        '<h1>لوحة الإدارة</h1>',
        '<small>ABSHER BI — Admin</small>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>نظرة عامة</h2></div>',
      '<div class="so-stats-grid">',
        '<div class="so-stat-card success">',
          '<div class="so-stat-value">' + d.totalUsers + '</div>',
          '<div class="so-stat-label">المستخدمون (' + d.activeUsers + ' نشط)</div>',
        '</div>',
        '<div class="so-stat-card info">',
          '<div class="so-stat-value">' + d.totalStores + '</div>',
          '<div class="so-stat-label">المتاجر (' + d.activeStores + ' نشط)</div>',
        '</div>',
        '<div class="so-stat-card info">',
          '<div class="so-stat-value">' + d.totalDrivers + '</div>',
          '<div class="so-stat-label">المندوبون (' + d.activeDrivers + ' نشط)</div>',
        '</div>',
      '</div>',
      '<div class="so-stats-grid-2" style="margin-top:10px">',
        '<div class="so-stat-big">',
          '<div class="so-stat-value-lg">' + d.totalOrders + '</div>',
          '<div class="so-stat-label">إجمالي الطلبات (' + d.pendingOrders + ' قيد الانتظار)</div>',
        '</div>',
        '<div class="so-stat-big">',
          '<div class="so-stat-value-lg">' + d.totalRevenue.toLocaleString('ar-YE') + '</div>',
          '<div class="so-stat-label">إجمالي الإيرادات (ريال)</div>',
        '</div>',
      '</div>',
      '<div class="so-stats-grid-2" style="margin-top:10px">',
        '<div class="so-stat-big">',
          '<div class="so-stat-value-lg">' + d.todayOrders + '</div>',
          '<div class="so-stat-label">طلبات اليوم</div>',
        '</div>',
        '<div class="so-stat-big">',
          '<div class="so-stat-value-lg">' + d.todayRevenue.toLocaleString('ar-YE') + '</div>',
          '<div class="so-stat-label">إيرادات اليوم (ريال)</div>',
        '</div>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>الأقسام</h2></div>',
      '<div class="admin-tabs">',
        '<button class="admin-tab active" type="button" data-tab="overview" onclick="adminSwitchTab(\'overview\')">نظرة</button>',
        '<button class="admin-tab" type="button" data-tab="users" onclick="adminSwitchTab(\'users\')">المستخدمون</button>',
        '<button class="admin-tab" type="button" data-tab="stores" onclick="adminSwitchTab(\'stores\')">المتاجر</button>',
        '<button class="admin-tab" type="button" data-tab="drivers" onclick="adminSwitchTab(\'drivers\')">المندوبون</button>',
        '<button class="admin-tab" type="button" data-tab="orders" onclick="adminSwitchTab(\'orders\')">الطلبات</button>',
        '<button class="admin-tab" type="button" data-tab="audit" onclick="adminSwitchTab(\'audit\')">التدقيق</button>',
      '</div>',
      '<div id="adminTabContent"></div>',
    '</section>',
  ].join('');

  // polling كل 30 ثانية
  adminState.poll = setInterval(function () {
    var v = document.getElementById('adminDashboardView');
    if (!v || v.classList.contains('hidden')) {
      clearInterval(adminState.poll);
      adminState.poll = null;
      return;
    }
    adminRefresh();
  }, 30000);
}

function adminSwitchTab(tab) {
  adminState.currentTab = tab;
  document.querySelectorAll('.admin-tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  adminLoadTab(tab);
}

async function adminLoadTab(tab) {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    if (tab === 'overview') {
      renderAdminOverview();
    } else if (tab === 'users') {
      await adminLoadUsers();
    } else if (tab === 'stores') {
      await adminLoadStores();
    } else if (tab === 'drivers') {
      await adminLoadDrivers();
    } else if (tab === 'orders') {
      await adminLoadOrders();
    } else if (tab === 'audit') {
      await adminLoadAudit();
    }
  } catch (e) {
    console.error('Admin load tab error:', e);
    el.innerHTML = [
      '<div class="empty">',
      '<div class="empty-icon">\u26A0\uFE0F</div>',
      '<strong>تعذر تحميل البيانات</strong>',
      '<p>' + escapeHtml(humanError(e)) + '</p>',
      '</div>',
    ].join('');
  }
}

function renderAdminOverview() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  var d = adminState.dashboard;
  el.innerHTML = [
    '<div class="admin-quick">',
      '<div class="info-card">',
        '<h3 style="margin-bottom:12px">ملخص سريع</h3>',
        '<p>\uD83D\uDC65 ' + d.activeUsers + ' مستخدم نشط من ' + d.totalUsers + '</p>',
        '<p style="margin-top:6px">\uD83C\uDFEA ' + d.activeStores + ' متجر نشط من ' + d.totalStores + '</p>',
        '<p style="margin-top:6px">\uD83D\uDEF5 ' + d.activeDrivers + ' مندوب نشط من ' + d.totalDrivers + '</p>',
        '<p style="margin-top:6px">\uD83D\uDCE6 ' + d.pendingOrders + ' طلب قيد الانتظار</p>',
        '<p style="margin-top:6px">\u2705 ' + d.deliveredOrders + ' طلب مُسلَّم</p>',
        '<p style="margin-top:6px">\u274C ' + d.cancelledOrders + ' طلب ملغي</p>',
      '</div>',
    '</div>',
  ].join('');
}

async function adminRefresh() {
  try {
    adminState.dashboard = await api('/admin/dashboard');
    if (adminState.currentTab === 'overview') {
      renderAdminDashboard();
      adminLoadTab('overview');
    }
  } catch (e) {
    console.warn('Admin refresh failed:', e);
  }
}

// ═══════════════════════════════════════════════════════════════
//  2) المستخدمون
// ═══════════════════════════════════════════════════════════════

async function adminLoadUsers() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    var params = new URLSearchParams({ limit: '50' });
    if (adminState.currentUserFilter) params.set('status', adminState.currentUserFilter);
    var res = await api('/admin/users?' + params);
    adminState.users = res.items || [];
    renderAdminUsers();
  } catch (e) {
    console.error('Admin load users error:', e);
    el.innerHTML = '<div class="empty"><strong>تعذر تحميل المستخدمين</strong><p>' + escapeHtml(humanError(e)) + '</p></div>';
  }
}

function renderAdminUsers() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;

  var filters = [
    '<div class="so-filters">',
      '<button class="so-filter ' + (!adminState.currentUserFilter ? 'active' : '') + '" type="button" onclick="adminFilterUsers(null)">الكل</button>',
      '<button class="so-filter ' + (adminState.currentUserFilter === 'active' ? 'active' : '') + '" type="button" onclick="adminFilterUsers(\'active\')">نشط</button>',
      '<button class="so-filter ' + (adminState.currentUserFilter === 'pending' ? 'active' : '') + '" type="button" onclick="adminFilterUsers(\'pending\')">قيد الانتظار</button>',
      '<button class="so-filter ' + (adminState.currentUserFilter === 'suspended' ? 'active' : '') + '" type="button" onclick="adminFilterUsers(\'suspended\')">موقوف</button>',
    '</div>',
  ].join('');

  if (!adminState.users.length) {
    el.innerHTML = filters + '<div class="empty"><div class="empty-icon">\uD83D\uDC65</div><strong>لا يوجد مستخدمون</strong></div>';
    return;
  }

  var rows = adminState.users.map(function (u) {
    var statusColor = u.status === 'active' ? 'success'
      : u.status === 'suspended' ? 'danger' : 'warning';
    return [
      '<div class="admin-user-row" onclick="adminOpenUser(\'' + u.id + '\')">',
        '<div class="admin-user-main">',
          '<strong>' + escapeHtml(u.fullName) + '</strong>',
          '<small>' + escapeHtml(u.email || u.phone || '') + '</small>',
          '<div class="admin-user-roles">',
            (u.roles || []).map(function (r) {
              return '<span class="admin-role-pill">' + escapeHtml(r) + '</span>';
            }).join(''),
          '</div>',
        '</div>',
        '<span class="status status-' + statusColor + '">' + adminUserStatusLabel(u.status) + '</span>',
      '</div>',
    ].join('');
  }).join('');

  el.innerHTML = filters + rows;
}

function adminUserStatusLabel(s) {
  return s === 'active' ? 'نشط'
    : s === 'pending' ? 'قيد الانتظار'
    : s === 'suspended' ? 'موقوف'
    : s === 'deleted' ? 'محذوف' : s;
}

function adminFilterUsers(status) {
  adminState.currentUserFilter = status;
  adminLoadUsers();
}

async function adminOpenUser(userId) {
  showView('adminUserDetailsView');
  var el = document.querySelector('#adminUserDetailsContent');
  if (el) el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    var u = await api('/admin/users/' + userId);
    renderAdminUserDetails(u);
  } catch (e) {
    console.error('Admin open user error:', e);
    if (el) el.innerHTML = '<div class="empty"><strong>تعذر تحميل المستخدم</strong></div>';
  }
}

function renderAdminUserDetails(u) {
  var el = document.querySelector('#adminUserDetailsContent');
  if (!el) return;

  var roleOptions = adminState.roles.map(function (r) {
    var has = (u.roles || []).indexOf(r.code) !== -1;
    return [
      '<div class="admin-role-row">',
        '<span>' + escapeHtml(r.nameAr) + ' <small>(' + escapeHtml(r.code) + ')</small></span>',
        has
          ? '<button class="btn btn-danger btn-small" type="button" onclick="adminRemoveRole(\'' + u.id + '\', \'' + r.code + '\')">إزالة</button>'
          : '<button class="btn btn-primary btn-small" type="button" onclick="adminAssignRole(\'' + u.id + '\', \'' + r.code + '\')">إضافة</button>',
      '</div>',
    ].join('');
  }).join('');

  el.innerHTML = [
    '<section class="section">',
      '<div class="order-details-header">',
        '<div>',
          '<h1>' + escapeHtml(u.fullName) + '</h1>',
          '<p style="color:var(--muted);margin-top:6px">' + escapeHtml(u.email || '') + '</p>',
          '<p style="color:var(--muted)">' + escapeHtml(u.phone || '') + '</p>',
        '</div>',
        '<span class="status status-' + (u.status === 'active' ? 'success' : 'warning') + '">' + adminUserStatusLabel(u.status) + '</span>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>الحالة</h2></div>',
      '<div class="admin-actions-grid">',
        '<button class="btn ' + (u.status === 'active' ? 'btn-secondary' : 'btn-primary') + ' btn-small" type="button" onclick="adminUpdateUserStatus(\'' + u.id + '\', \'active\')">تفعيل</button>',
        '<button class="btn btn-secondary btn-small" type="button" onclick="adminUpdateUserStatus(\'' + u.id + '\', \'suspended\')">إيقاف</button>',
        '<button class="btn btn-danger btn-small" type="button" onclick="adminUpdateUserStatus(\'' + u.id + '\', \'deleted\')">حذف</button>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>الأدوار</h2></div>',
      '<div class="info-card">' + roleOptions + '</div>',
    '</section>',

    '<button class="btn btn-secondary full" type="button" onclick="showView(\'adminDashboardView\'); adminSwitchTab(\'users\');">\u2190 رجوع</button>',
  ].join('');
}

async function adminUpdateUserStatus(userId, status) {
  if (!confirm('تغيير حالة المستخدم إلى "' + adminUserStatusLabel(status) + '"؟')) return;
  showLoading('جاري التحديث...');
  try {
    var u = await api('/admin/users/' + userId + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: status }),
    });
    toast('تم تحديث الحالة');
    renderAdminUserDetails(u);
  } catch (e) {
    console.error('Update user status error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function adminAssignRole(userId, code) {
  showLoading('جاري الإضافة...');
  try {
    var u = await api('/admin/users/' + userId + '/roles', {
      method: 'POST',
      body: JSON.stringify({ code: code }),
    });
    toast('تم إضافة الدور');
    renderAdminUserDetails(u);
  } catch (e) {
    console.error('Assign role error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function adminRemoveRole(userId, code) {
  if (!confirm('إزالة الدور ' + code + '؟')) return;
  showLoading('جاري الإزالة...');
  try {
    var u = await api('/admin/users/' + userId + '/roles/' + code, { method: 'DELETE' });
    toast('تم إزالة الدور');
    renderAdminUserDetails(u);
  } catch (e) {
    console.error('Remove role error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════════
//  3) المتاجر
// ═══════════════════════════════════════════════════════════════

async function adminLoadStores() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';
  try {
    var res = await api('/admin/stores?limit=50');
    adminState.stores = res.items || [];
    renderAdminStores();
  } catch (e) {
    el.innerHTML = '<div class="empty"><strong>تعذر تحميل المتاجر</strong></div>';
  }
}

function renderAdminStores() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  if (!adminState.stores.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">\uD83C\uDFEA</div><strong>لا توجد متاجر</strong></div>';
    return;
  }
  el.innerHTML = adminState.stores.map(function (s) {
    var color = s.status === 'active' ? 'success' : s.status === 'suspended' ? 'danger' : 'warning';
    return [
      '<div class="admin-user-row">',
        '<div class="admin-user-main">',
          '<strong>' + escapeHtml(s.nameAr) + '</strong>',
          '<small>' + escapeHtml(s.ownerEmail || '') + '</small>',
          '<div class="admin-user-roles">',
            '<span class="admin-role-pill">\u2B50 ' + s.ratingAvg + ' (' + s.ratingCount + ')</span>',
            '<span class="admin-role-pill">' + (s.isOpen ? 'مفتوح' : 'مغلق') + '</span>',
          '</div>',
        '</div>',
        '<span class="status status-' + color + '">' + s.status + '</span>',
      '</div>',
    ].join('');
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  4) المندوبون
// ═══════════════════════════════════════════════════════════════

async function adminLoadDrivers() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';
  try {
    var res = await api('/admin/drivers?limit=50');
    adminState.drivers = res.items || [];
    renderAdminDrivers();
  } catch (e) {
    el.innerHTML = '<div class="empty"><strong>تعذر تحميل المندوبين</strong></div>';
  }
}

function renderAdminDrivers() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  if (!adminState.drivers.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">\uD83D\uDEF5</div><strong>لا يوجد مندوبون</strong></div>';
    return;
  }
  el.innerHTML = adminState.drivers.map(function (d) {
    var color = d.status === 'active' ? 'success' : d.status === 'suspended' ? 'danger' : 'warning';
    return [
      '<div class="admin-user-row">',
        '<div class="admin-user-main">',
          '<strong>' + escapeHtml(d.fullName) + '</strong>',
          '<small>' + escapeHtml(d.phone || d.email || '') + '</small>',
          '<div class="admin-user-roles">',
            '<span class="admin-role-pill">' + escapeHtml(d.vehicleType || '') + '</span>',
            '<span class="admin-role-pill">' + escapeHtml(d.availability) + '</span>',
            '<span class="admin-role-pill">\u2B50 ' + d.ratingAvg + '</span>',
          '</div>',
        '</div>',
        '<span class="status status-' + color + '">' + d.status + '</span>',
      '</div>',
    ].join('');
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  5) الطلبات
// ═══════════════════════════════════════════════════════════════

async function adminLoadOrders() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';
  try {
    var params = new URLSearchParams({ limit: '50' });
    if (adminState.currentOrderFilter) params.set('status', adminState.currentOrderFilter);
    var res = await api('/admin/orders?' + params);
    adminState.orders = res.items || [];
    renderAdminOrders();
  } catch (e) {
    el.innerHTML = '<div class="empty"><strong>تعذر تحميل الطلبات</strong></div>';
  }
}

function renderAdminOrders() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;

  var filters = [
    '<div class="so-filters">',
      '<button class="so-filter ' + (!adminState.currentOrderFilter ? 'active' : '') + '" type="button" onclick="adminFilterOrders(null)">الكل</button>',
      '<button class="so-filter ' + (adminState.currentOrderFilter === 'pending' ? 'active' : '') + '" type="button" onclick="adminFilterOrders(\'pending\')">جديد</button>',
      '<button class="so-filter ' + (adminState.currentOrderFilter === 'delivered' ? 'active' : '') + '" type="button" onclick="adminFilterOrders(\'delivered\')">تم التوصيل</button>',
      '<button class="so-filter ' + (adminState.currentOrderFilter === 'cancelled' ? 'active' : '') + '" type="button" onclick="adminFilterOrders(\'cancelled\')">ملغي</button>',
    '</div>',
  ].join('');

  if (!adminState.orders.length) {
    el.innerHTML = filters + '<div class="empty"><div class="empty-icon">\uD83D\uDCE6</div><strong>لا توجد طلبات</strong></div>';
    return;
  }

  el.innerHTML = filters + adminState.orders.map(function (o) {
    var status = DRIVER_STATUS_LABELS[o.status] || { label: o.status, color: 'info' };
    return [
      '<div class="so-order-card status-border-' + status.color + '">',
        '<div class="so-order-head">',
          '<div>',
            '<strong>' + escapeHtml(o.orderNumber) + '</strong>',
            '<small>' + escapeHtml(o.customerName || '') + ' \u2192 ' + escapeHtml(o.storeName || '') + '</small>',
          '</div>',
          '<span class="status status-' + status.color + '">' + status.label + '</span>',
        '</div>',
        '<div class="so-order-body">',
          '<div>\uD83D\uDCB0 ' + formatPrice(o.total) + '</div>',
          o.driverName ? '<div>\uD83D\uDEF5 ' + escapeHtml(o.driverName) + '</div>' : '<div style="color:#f59e0b">بدون مندوب</div>',
        '</div>',
      '</div>',
    ].join('');
  }).join('');
}

function adminFilterOrders(status) {
  adminState.currentOrderFilter = status;
  adminLoadOrders();
}

// ═══════════════════════════════════════════════════════════════
//  6) Audit Logs
// ═══════════════════════════════════════════════════════════════

async function adminLoadAudit() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';
  try {
    var res = await api('/admin/audit-logs?limit=50');
    adminState.auditLogs = res.items || [];
    renderAdminAudit();
  } catch (e) {
    el.innerHTML = '<div class="empty"><strong>تعذر تحميل السجلات</strong></div>';
  }
}

function renderAdminAudit() {
  var el = document.querySelector('#adminTabContent');
  if (!el) return;
  if (!adminState.auditLogs.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">\uD83D\uDCDD</div><strong>لا توجد سجلات</strong></div>';
    return;
  }
  el.innerHTML = adminState.auditLogs.map(function (a) {
    return [
      '<div class="admin-audit-row">',
        '<div>',
          '<strong>' + escapeHtml(a.action) + '</strong>',
          '<small>' + escapeHtml(a.entityType || '') + (a.entityId ? ' \u00B7 ' + escapeHtml(a.entityId.slice(0, 8)) : '') + '</small>',
        '</div>',
        '<small style="color:var(--muted)">' + formatTimeAgo(a.createdAt) + '</small>',
      '</div>',
    ].join('');
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  Export
// ═══════════════════════════════════════════════════════════════

window.openAdminDashboard = openAdminDashboard;
window.adminSwitchTab = adminSwitchTab;
window.adminLoadTab = adminLoadTab;
window.adminRefresh = adminRefresh;
window.adminFilterUsers = adminFilterUsers;
window.adminOpenUser = adminOpenUser;
window.adminUpdateUserStatus = adminUpdateUserStatus;
window.adminAssignRole = adminAssignRole;
window.adminRemoveRole = adminRemoveRole;
window.adminFilterOrders = adminFilterOrders;
