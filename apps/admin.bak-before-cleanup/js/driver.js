/* ============================================================
   ABSHER BI - driver.js
   منطق المندوب: ملف، إتاحة، طلبات متاحة، مهامي، أرباح
   ============================================================ */

var driverState = {
  profile: null,
  availableOrders: [],
  myOrders: [],
  earnings: null,
  currentTab: 'available',
  poll: null,
};

window.driverState = driverState;

// ═══════════════════════════════════════════════════════════════
//  1) لوحة المندوب
// ═══════════════════════════════════════════════════════════════

async function openDriverDashboard() {
  if (driverState.poll) {
    clearInterval(driverState.poll);
    driverState.poll = null;
  }

  showView('driverDashboardView');
  var el = document.querySelector('#driverDashboardContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    var profile = await api('/driver/profile');
    driverState.profile = profile;
    renderDriverDashboard();
    await loadDriverStats();

    setTimeout(function () {
      if (typeof window.startSmartDispatch === 'function') {
        window.startSmartDispatch();
      } else {
        console.warn('[SmartDispatch] startSmartDispatch غير متاح');
      }
    }, 150);
  } catch (e) {
    console.error('Open driver dashboard error:', e);
    var msg = humanError(e);
    el.innerHTML = [
      '<div class="empty">',
      '<div class="empty-icon">&#x26A0;&#xFE0F;</div>',
      '<strong>تعذر فتح لوحة المندوب</strong>',
      '<p>' + escapeHtml(msg) + '</p>',
      '</div>'
    ].join('');
  }
}

function renderDriverDashboard() {
  var el = document.querySelector('#driverDashboardContent');
  if (!el) return;
  var d = driverState.profile;
  if (!d) return;

  var availabilityClass = d.availability === 'online' ? 'ok'
    : d.availability === 'busy' ? 'warning' : 'off';

  var availabilityLabel = d.availability === 'online' ? '\u25CF متاح'
    : d.availability === 'busy' ? '\u25CF مشغول' : '\u25CF غير متصل';

  var el_status = d.status === 'active' ? 'ok' : 'off';
  var el_status_label = d.status === 'active' ? '\u25CF نشط' : '\u25CF ' + d.status;

  el.innerHTML = [
    '<section class="driver-header">',
      '<div class="driver-header-info">',
        '<div class="driver-avatar">\uD83D\uDEF5</div>',
        '<div>',
          '<h1>' + escapeHtml(d.fullName) + '</h1>',
          '<small>' + escapeHtml(d.phone || 'لا يوجد هاتف') + '</small>',
          '<div class="so-status-row" style="margin-top:8px">',
            '<span class="so-pill ' + availabilityClass + '">' + availabilityLabel + '</span>',
            '<span class="so-pill ' + el_status + '">' + el_status_label + '</span>',
            '<span class="so-pill rating">\u2B50 ' + d.ratingAvg + ' (' + d.ratingCount + ')</span>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="driver-actions">',
        '<button class="btn btn-secondary btn-small" type="button" onclick="driverToggleAvailability()">',
          d.availability === 'online' ? 'إيقاف التوفر' : 'تشغيل التوفر',
        '</button>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>الأرباح</h2></div>',
      '<div id="driverEarningsBox">',
        '<div class="empty"><div class="spinner" style="margin:auto"></div></div>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title">',
        '<h2>طلباتي ومهامي</h2>',
        '<button type="button" onclick="driverRefreshAll()">تحديث</button>',
      '</div>',
      '<div class="driver-tabs">',
        '<button class="driver-tab active" type="button" data-tab="available" onclick="driverSwitchTab(\'available\')">متاحة</button>',
        '<button class="driver-tab" type="button" data-tab="mine" onclick="driverSwitchTab(\'mine\')">مهامي</button>',
      '</div>',
      '<div id="driverOrdersList">',
        '<div class="empty"><div class="spinner" style="margin:auto"></div></div>',
      '</div>',
    '</section>',
  ].join('');

  // polling
  driverState.poll = setInterval(function () {
    var v = document.getElementById('driverDashboardView');
    if (!v || v.classList.contains('hidden')) {
      clearInterval(driverState.poll);
      driverState.poll = null;
      return;
    }
    driverLoadOrders(true);
  }, 15000);
}

async function loadDriverStats() {
  try {
    var e = await api('/driver/earnings');
    driverState.earnings = e;
    renderDriverEarnings(e);
  } catch (err) {
    console.warn('Load earnings failed:', err);
  }
  await driverLoadOrders();
}

function renderDriverEarnings(e) {
  var el = document.querySelector('#driverEarningsBox');
  if (!el) return;
  el.innerHTML = [
    '<div class="so-stats-grid">',
      '<div class="so-stat-card success">',
        '<div class="so-stat-value">' + e.todayDeliveries + '</div>',
        '<div class="so-stat-label">توصيلات اليوم</div>',
      '</div>',
      '<div class="so-stat-card info">',
        '<div class="so-stat-value">' + e.weekDeliveries + '</div>',
        '<div class="so-stat-label">هذا الأسبوع</div>',
      '</div>',
      '<div class="so-stat-card info">',
        '<div class="so-stat-value">' + e.monthDeliveries + '</div>',
        '<div class="so-stat-label">هذا الشهر</div>',
      '</div>',
    '</div>',
    '<div class="so-stats-grid-2" style="margin-top:10px">',
      '<div class="so-stat-big">',
        '<div class="so-stat-value-lg">' + e.todayEarnings.toLocaleString('ar-YE') + '</div>',
        '<div class="so-stat-label">أرباح اليوم (ريال)</div>',
      '</div>',
      '<div class="so-stat-big">',
        '<div class="so-stat-value-lg">' + e.totalEarnings.toLocaleString('ar-YE') + '</div>',
        '<div class="so-stat-label">إجمالي الأرباح (' + e.totalDeliveries + ' توصيل)</div>',
      '</div>',
    '</div>',
  ].join('');
}

async function driverToggleAvailability() {
  var d = driverState.profile;
  if (!d) return;
  var next = d.availability === 'online' ? 'offline' : 'online';
  showLoading(next === 'online' ? 'جاري تشغيل التوفر...' : 'جاري الإيقاف...');
  try {
    var updated = await api('/driver/availability', {
      method: 'PATCH',
      body: JSON.stringify({ availability: next }),
    });
    driverState.profile = updated;
    toast(updated.availability === 'online' ? 'أنت متاح الآن' : 'تم إيقاف التوفر');
    renderDriverDashboard();
    await loadDriverStats();
  } catch (e) {
    console.error('Toggle availability error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

function driverSwitchTab(tab) {
  driverState.currentTab = tab;
  document.querySelectorAll('.driver-tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  driverLoadOrders();
}

function driverRefreshAll() {
  loadDriverStats();
  toast('جاري التحديث...');
}

// ═══════════════════════════════════════════════════════════════
//  2) الطلبات
// ═══════════════════════════════════════════════════════════════

async function driverLoadOrders(silent) {
  var el = document.querySelector('#driverOrdersList');
  if (!el) return;
  if (!silent) {
    el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';
  }

  var url = driverState.currentTab === 'available'
    ? '/driver/orders/available?limit=30'
    : '/driver/orders/my?limit=30';

  try {
    var res = await api(url);
    var items = res.items || [];
    if (driverState.currentTab === 'available') {
      driverState.availableOrders = items;
    } else {
      driverState.myOrders = items;
    }
    renderDriverOrders(items);
  } catch (e) {
    console.error('Driver load orders error:', e);
    if (!silent) {
      el.innerHTML = [
        '<div class="empty">',
        '<div class="empty-icon">\u26A0\uFE0F</div>',
        '<strong>تعذر تحميل الطلبات</strong>',
        '<p>' + escapeHtml(humanError(e)) + '</p>',
        '</div>',
      ].join('');
    }
  }
}

function renderDriverOrders(orders) {
  var el = document.querySelector('#driverOrdersList');
  if (!el) return;

  if (!orders.length) {
    var msg = driverState.currentTab === 'available'
      ? 'لا توجد طلبات متاحة حاليًا'
      : 'لا توجد مهام حالية';
    el.innerHTML = [
      '<div class="empty">',
      '<div class="empty-icon">\uD83D\uDCE6</div>',
      '<strong>' + msg + '</strong>',
      '<p>ستظهر هنا عند توفرها</p>',
      '</div>',
    ].join('');
    return;
  }

  el.innerHTML = orders.map(function (o) {
    var status = DRIVER_STATUS_LABELS[o.status] || { label: o.status, color: 'info' };
    var actions = [];

    if (driverState.currentTab === 'available') {
      actions.push('<button class="btn btn-primary btn-small" type="button" onclick="event.stopPropagation(); driverAcceptOrder(\'' + o.id + '\')">\u2705 قبول</button>');
    } else {
      if (o.status === 'driverAssigned' || o.status === 'driverGoingToStore' || o.status === 'driverArrivedStore') {
        actions.push('<button class="btn btn-primary btn-small" type="button" onclick="event.stopPropagation(); driverPickup(\'' + o.id + '\')">\uD83D\uDCE6 استلمت</button>');
      } else if (o.status === 'pickedUp') {
        actions.push('<button class="btn btn-primary btn-small" type="button" onclick="event.stopPropagation(); driverInTransit(\'' + o.id + '\')">\uD83D\uDE80 في الطريق</button>');
      } else if (o.status === 'driverGoingToCustomer') {
        actions.push('<button class="btn btn-primary btn-small" type="button" onclick="event.stopPropagation(); driverArrived(\'' + o.id + '\')">\uD83D\uDCCD وصلت</button>');
      } else if (o.status === 'driverArrivedCustomer') {
        actions.push('<button class="btn btn-primary btn-small" type="button" onclick="event.stopPropagation(); driverDeliver(\'' + o.id + '\')">\u2705 تم التسليم</button>');
      }
    }

    return [
      '<div class="so-order-card status-border-' + status.color + '" onclick="openDriverOrderDetails(\'' + o.id + '\', ' + (driverState.currentTab === 'available' ? 'true' : 'false') + ')">',
        '<div class="so-order-head">',
          '<div>',
            '<strong>' + escapeHtml(o.orderNumber) + '</strong>',
            '<small>' + escapeHtml(o.storeName || '') + '</small>',
          '</div>',
          '<span class="status status-' + status.color + '">' + status.label + '</span>',
        '</div>',
        '<div class="so-order-body">',
          '<div>\uD83D\uDCE6 ' + (o.items ? o.items.length : '?') + ' منتج</div>',
          '<div>\uD83D\uDCB0 ' + formatPrice(o.total) + '</div>',
          '<div>\uD83D\uDCB5 ربحك: ' + formatPrice(o.driverEarning) + '</div>',
        '</div>',
        actions.length ? '<div class="so-order-actions">' + actions.join('') + '</div>' : '',
      '</div>',
    ].join('');
  }).join('');
}

async function openDriverOrderDetails(orderId, isAvailable) {
  showView('driverOrderDetailsView');
  var el = document.querySelector('#driverOrderDetailsContent');
  if (el) el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  var url = isAvailable
    ? '/driver/orders/available/' + orderId
    : '/driver/orders/my/' + orderId;

  try {
    var order = await api(url);
    renderDriverOrderDetails(order, isAvailable);
  } catch (e) {
    console.error('Driver order details error:', e);
    if (el) {
      el.innerHTML = [
        '<div class="empty">',
        '<div class="empty-icon">\u26A0\uFE0F</div>',
        '<strong>تعذر تحميل الطلب</strong>',
        '<p>' + escapeHtml(humanError(e)) + '</p>',
        '</div>',
      ].join('');
    }
  }
}

function renderDriverOrderDetails(order, isAvailable) {
  var el = document.querySelector('#driverOrderDetailsContent');
  if (!el) return;
  var status = DRIVER_STATUS_LABELS[order.status] || { label: order.status, color: 'info' };

  var actionHtml = '';
  if (isAvailable) {
    actionHtml = '<button class="btn btn-primary full" type="button" onclick="driverAcceptOrder(\'' + order.id + '\')">\u2705 قبول المهمة</button>';
  } else {
    if (order.status === 'driverAssigned' || order.status === 'driverGoingToStore' || order.status === 'driverArrivedStore') {
      actionHtml = '<button class="btn btn-primary full" type="button" onclick="driverPickup(\'' + order.id + '\')">\uD83D\uDCE6 استلمت الطلب من المتجر</button>';
    } else if (order.status === 'pickedUp') {
      actionHtml = '<button class="btn btn-primary full" type="button" onclick="driverInTransit(\'' + order.id + '\')">\uD83D\uDE80 في الطريق للعميل</button>';
    } else if (order.status === 'driverGoingToCustomer') {
      actionHtml = '<button class="btn btn-primary full" type="button" onclick="driverArrived(\'' + order.id + '\')">\uD83D\uDCCD وصلت للعميل</button>';
    } else if (order.status === 'driverArrivedCustomer') {
      actionHtml = '<button class="btn btn-primary full" type="button" onclick="driverDeliver(\'' + order.id + '\')">\u2705 تم التسليم</button>';
    }
  }

  var storeMapUrl = 'https://www.openstreetmap.org/?mlat=' + order.storeLatitude + '&mlon=' + order.storeLongitude + '#map=16/' + order.storeLatitude + '/' + order.storeLongitude;
  var customerMapUrl = 'https://www.openstreetmap.org/?mlat=' + order.deliveryLatitude + '&mlon=' + order.deliveryLongitude + '#map=16/' + order.deliveryLatitude + '/' + order.deliveryLongitude;

  el.innerHTML = [
    '<section class="section">',
      '<div class="order-details-header">',
        '<div>',
          '<h1>' + escapeHtml(order.orderNumber) + '</h1>',
          '<p style="color:var(--muted);margin-top:6px">' + formatTimeAgo(order.createdAt) + '</p>',
        '</div>',
        '<span class="status status-' + status.color + '">' + status.label + '</span>',
      '</div>',
    '</section>',

    actionHtml ? '<section class="section">' + actionHtml + '</section>' : '',

    '<section class="section">',
      '<div class="section-title"><h2>المتجر (نقطة الاستلام)</h2></div>',
      '<div class="info-card">',
        '<p><strong>\uD83C\uDFEA ' + escapeHtml(order.storeName || '') + '</strong></p>',
        '<p style="margin-top:6px">\uD83D\uDCCD ' + escapeHtml(order.storeAddressText) + '</p>',
        order.storePhone ? '<p style="margin-top:6px">\uD83D\uDCF1 <a href="tel:' + escapeHtml(order.storePhone) + '">' + escapeHtml(order.storePhone) + '</a></p>' : '',
        '<a class="btn btn-secondary btn-small" style="margin-top:10px;display:inline-block;text-decoration:none" href="' + storeMapUrl + '" target="_blank">\uD83D\uDDFA\uFE0F فتح الموقع</a>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>العميل (نقطة التسليم)</h2></div>',
      '<div class="info-card">',
        '<p><strong>\uD83D\uDC64 ' + escapeHtml(order.recipientName) + '</strong></p>',
        '<p style="margin-top:6px">\uD83D\uDCF1 <a href="tel:' + escapeHtml(order.recipientPhone) + '">' + escapeHtml(order.recipientPhone) + '</a></p>',
        '<p style="margin-top:6px">\uD83D\uDCCD ' + escapeHtml(order.deliveryAddressText) + '</p>',
        order.customerNotes ? '<p style="margin-top:10px">\uD83D\uDCDD ' + escapeHtml(order.customerNotes) + '</p>' : '',
        '<a class="btn btn-secondary btn-small" style="margin-top:10px;display:inline-block;text-decoration:none" href="' + customerMapUrl + '" target="_blank">\uD83D\uDDFA\uFE0F فتح الموقع</a>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-title"><h2>المنتجات</h2></div>',
      (order.items || []).map(function (i) {
        return [
          '<div class="order-item-row">',
            '<div>',
              '<strong>' + escapeHtml(i.productName) + '</strong>',
              i.variantName ? '<small>' + escapeHtml(i.variantName) + '</small>' : '',
              i.notes ? '<p style="font-size:12px;color:var(--muted);margin-top:4px">\uD83D\uDCDD ' + escapeHtml(i.notes) + '</p>' : '',
            '</div>',
            '<div style="text-align:left">',
              '<div>' + i.quantity + ' \u00D7 ' + formatPrice(i.unitPrice) + '</div>',
              '<strong style="color:#86efac">' + formatPrice(i.lineTotal) + '</strong>',
            '</div>',
          '</div>',
        ].join('');
      }).join(''),
      '<div class="cart-summary" style="margin-top:16px">',
        '<div class="summary-row"><span>المنتجات</span><strong>' + formatPrice(order.subtotal) + '</strong></div>',
        '<div class="summary-row"><span>التوصيل (ربحك)</span><strong style="color:#86efac">' + formatPrice(order.deliveryFee) + '</strong></div>',
        '<div class="summary-row total"><span>الإجمالي للعميل</span><strong>' + formatPrice(order.total) + '</strong></div>',
        '<div class="summary-row"><span>طريقة الدفع</span><strong>' + (order.paymentMethod === 'cash_on_delivery' ? 'نقد عند الاستلام' : order.paymentMethod) + '</strong></div>',
      '</div>',
    '</section>',

    '<button class="btn btn-secondary full" style="margin-top:20px" type="button" onclick="showView(\'driverDashboardView\'); openDriverDashboard();">\u2190 رجوع للوحة</button>',
  ].join('');
}

// ═══════════════════════════════════════════════════════════════
//  3) أفعال الطلبات
// ═══════════════════════════════════════════════════════════════

async function driverAcceptOrder(orderId) {
  showLoading('جاري القبول...');
  try {
    await api('/driver/orders/' + orderId + '/accept', { method: 'POST' });
    toast('تم قبول المهمة');
    showView('driverDashboardView');
    await openDriverDashboard();
  } catch (e) {
    console.error('Accept error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function driverPickup(orderId) {
  showLoading('جاري التحديث...');
  try {
    await api('/driver/orders/' + orderId + '/pickup', { method: 'POST' });
    toast('تم استلام الطلب من المتجر');
    await openDriverOrderDetails(orderId, false);
  } catch (e) {
    console.error('Pickup error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function driverInTransit(orderId) {
  showLoading('جاري التحديث...');
  try {
    await api('/driver/orders/' + orderId + '/in-transit', { method: 'POST' });
    toast('أنت في الطريق للعميل');
    await openDriverOrderDetails(orderId, false);
  } catch (e) {
    console.error('In-transit error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function driverArrived(orderId) {
  showLoading('جاري التحديث...');
  try {
    await api('/driver/orders/' + orderId + '/arrived', { method: 'POST' });
    toast('تم تسجيل وصولك');
    await openDriverOrderDetails(orderId, false);
  } catch (e) {
    console.error('Arrived error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

async function driverDeliver(orderId) {
  if (!confirm('تأكيد تسليم الطلب للعميل؟')) return;
  showLoading('جاري التسليم...');
  try {
    await api('/driver/orders/' + orderId + '/deliver', { method: 'POST' });
    toast('تم التسليم بنجاح \uD83C\uDF89');
    showView('driverDashboardView');
    await openDriverDashboard();
  } catch (e) {
    console.error('Deliver error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════════
//  4) Helpers
// ═══════════════════════════════════════════════════════════════

var DRIVER_STATUS_LABELS = {
  pending:                { label: 'بانتظار التأكيد',  color: 'warning' },
  accepted:               { label: 'تم القبول',        color: 'info' },
  preparing:              { label: 'قيد التحضير',      color: 'info' },
  ready:                  { label: 'جاهز للاستلام',    color: 'info' },
  driverAssigned:         { label: 'مقبول منك',        color: 'info' },
  driverGoingToStore:     { label: 'متجه للمتجر',      color: 'info' },
  driverArrivedStore:     { label: 'وصلت المتجر',      color: 'info' },
  pickedUp:               { label: 'معك الآن',         color: 'info' },
  driverGoingToCustomer:  { label: 'في الطريق للعميل', color: 'info' },
  driverArrivedCustomer:  { label: 'وصلت للعميل',      color: 'info' },
  delivered:              { label: 'تم التوصيل',       color: 'success' },
  cancelled:              { label: 'ملغي',             color: 'danger' },
};

// Expose to window
window.openDriverDashboard = openDriverDashboard;
window.driverToggleAvailability = driverToggleAvailability;
window.driverSwitchTab = driverSwitchTab;
window.driverRefreshAll = driverRefreshAll;
window.openDriverOrderDetails = openDriverOrderDetails;
window.driverAcceptOrder = driverAcceptOrder;
window.driverPickup = driverPickup;
window.driverInTransit = driverInTransit;
window.driverArrived = driverArrived;
window.driverDeliver = driverDeliver;
