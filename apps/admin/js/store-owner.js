/* ============================================================
   ABSHER BI — store-owner.js
   نسخة محسّنة وخفيفة لصاحب المتجر
   ============================================================ */

const soState = {
  store: null,
  stats: null,
  products: [],
  categories: [],
  orders: [],
  currentOrdersFilter: null,
  editingProductId: null,

  ordersPoll: null,

  // منع الطلبات المتكررة
  loadingDashboard: false,
  loadingOrders: false,
  loadingProducts: false,
  loadingCategories: false,
  loadingRecentOrders: false,
};


/* ============================================================
   1) لوحة التحكم
   ============================================================ */

async function openStoreDashboard() {
  if (soState.ordersPoll) {
    clearInterval(soState.ordersPoll);
    soState.ordersPoll = null;
  }

  showView('storeDashboardView');

  const el = document.querySelector('#storeDashboardContent');
  if (!el) return;

  /*
   * إذا كانت بيانات المتجر موجودة، اعرضها فورًا
   * بدون انتظار API.
   */
  if (soState.store) {
    renderStoreDashboard();
  } else {
    el.innerHTML = `
      <section class="section">
        <div class="empty" style="padding:35px 20px">
          <div class="spinner" style="margin:auto"></div>
          <p style="margin-top:12px">جاري تجهيز متجرك...</p>
        </div>
      </section>
    `;
  }

  /*
   * لا تسمح بتشغيل أكثر من تحميل للوحة في نفس الوقت.
   */
  if (soState.loadingDashboard) {
    return;
  }

  soState.loadingDashboard = true;

  try {
    /*
     * جلب المتجر والإحصائيات بالتوازي.
     */
    const storePromise = api('/store-owner/my-store');
    const statsPromise = api('/store-owner/stats');

    /*
     * المتجر أهم شيء لرسم الواجهة.
     */
    const store = await storePromise;

    soState.store = store;

    /*
     * اعرض الواجهة فور وصول بيانات المتجر.
     * لا تنتظر الإحصائيات.
     */
    renderStoreDashboard();

    /*
     * الإحصائيات تصل في الخلفية.
     */
    try {
      const stats = await statsPromise;
      soState.stats = stats;
      updateStoreStats();
    } catch (statsError) {
      console.warn('Store stats failed:', statsError);
    }

    /*
     * تحميل آخر الطلبات في الخلفية.
     */
    loadRecentOrders();

    /*
     * تحديث خفيف كل 60 ثانية بدل 30.
     */
    soState.ordersPoll = setInterval(() => {
      const view = document.querySelector('#storeDashboardView');

      if (!view || view.classList.contains('hidden')) {
        clearInterval(soState.ordersPoll);
        soState.ordersPoll = null;
        return;
      }

      loadRecentOrders(true);
    }, 60000);

  } catch (e) {
    console.error('Open store dashboard error:', e);

    const msg = humanError(e);

    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <strong>تعذر فتح لوحة المتجر</strong>
        <p>${escapeHtml(msg)}</p>
        ${
          msg.includes('لا تملك') || msg.includes('do not own')
            ? '<p style="font-size:12px;color:var(--muted);margin-top:8px">هذا الحساب ليس صاحب متجر</p>'
            : ''
        }
      </div>
    `;
  } finally {
    soState.loadingDashboard = false;
  }
}


/* ============================================================
   رسم لوحة المتجر
   ============================================================ */

function renderStoreDashboard() {
  const el = document.querySelector('#storeDashboardContent');

  if (!el) return;

  const s = soState.store;

  if (!s) return;

  /*
   * يمكن رسم الواجهة حتى لو الإحصائيات لم تصل بعد.
   */
  const st = soState.stats || {
    pendingOrders: 0,
    acceptedOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    availableProducts: 0,
  };

  el.innerHTML = `
    <!-- رأس المتجر -->
    <section class="so-header">
      <div class="so-header-info">

        <div class="so-logo"
          style="${s.logoUrl ? `background-image:url('${escapeHtml(s.logoUrl)}')` : ''}">
          ${s.logoUrl ? '' : '🏪'}
        </div>

        <div>
          <h1>${escapeHtml(s.nameAr || '')}</h1>
          <small>${escapeHtml(s.nameEn || '')}</small>

          <div class="so-status-row">

            <span class="so-pill ${s.isOpen ? 'ok' : 'off'}">
              ${s.isOpen ? '● مفتوح' : '● مغلق'}
            </span>

            <span class="so-pill ${s.acceptsOrders ? 'ok' : 'off'}">
              ${s.acceptsOrders ? '● يستقبل طلبات' : '● موقوف'}
            </span>

            <span class="so-pill rating">
              ⭐ ${s.ratingAvg || 0} (${s.ratingCount || 0})
            </span>

          </div>
        </div>
      </div>

      <button
        class="btn btn-secondary btn-small"
        type="button"
        onclick="toggleStoreOpen()">
        ${s.isOpen ? 'إغلاق المتجر' : 'فتح المتجر'}
      </button>
    </section>


    <!-- الإحصائيات -->
    <section class="section">

      <div class="section-title">
        <h2>الإحصائيات</h2>
      </div>

      <div class="so-stats-grid">

        <div class="so-stat-card pending"
          onclick="soFilterOrders('pending')">
          <div id="soStatPending" class="so-stat-value">
            ${st.pendingOrders}
          </div>
          <div class="so-stat-label">بانتظار التأكيد</div>
        </div>

        <div class="so-stat-card info"
          onclick="soFilterOrders('accepted')">
          <div id="soStatAccepted" class="so-stat-value">
            ${st.acceptedOrders}
          </div>
          <div class="so-stat-label">مقبولة</div>
        </div>

        <div class="so-stat-card info"
          onclick="soFilterOrders('preparing')">
          <div id="soStatPreparing" class="so-stat-value">
            ${st.preparingOrders}
          </div>
          <div class="so-stat-label">قيد التحضير</div>
        </div>

        <div class="so-stat-card info"
          onclick="soFilterOrders('ready')">
          <div id="soStatReady" class="so-stat-value">
            ${st.readyOrders}
          </div>
          <div class="so-stat-label">جاهزة</div>
        </div>

        <div class="so-stat-card success"
          onclick="soFilterOrders('delivered')">
          <div id="soStatDelivered" class="so-stat-value">
            ${st.deliveredOrders}
          </div>
          <div class="so-stat-label">تم التوصيل</div>
        </div>

        <div class="so-stat-card danger"
          onclick="soFilterOrders('cancelled')">
          <div id="soStatCancelled" class="so-stat-value">
            ${st.cancelledOrders}
          </div>
          <div class="so-stat-label">ملغاة</div>
        </div>

      </div>


      <div class="so-stats-grid-2">

        <div class="so-stat-big">
          <div id="soStatRevenue" class="so-stat-value-lg">
            ${Number(st.totalRevenue || 0).toLocaleString('ar-YE')}
          </div>
          <div class="so-stat-label">
            إجمالي الإيرادات (ريال)
          </div>
        </div>

        <div class="so-stat-big">
          <div id="soStatProducts" class="so-stat-value-lg">
            ${st.totalProducts || 0}
          </div>
          <div class="so-stat-label">
            إجمالي المنتجات
            (${st.availableProducts || 0} متوفر)
          </div>
        </div>

      </div>
    </section>


    <!-- الإجراءات السريعة -->
    <section class="section">

      <div class="section-title">
        <h2>إجراءات سريعة</h2>
      </div>

      <div class="so-actions-grid">

        <button
          class="so-action-btn"
          type="button"
          onclick="showView('soOrdersView')">
          <span>📋</span>
          <strong>الطلبات</strong>
          <small>استقبل وأدر الطلبات</small>
        </button>

        <button
          class="so-action-btn"
          type="button"
          onclick="showView('soProductsView')">
          <span>🍽️</span>
          <strong>المنتجات</strong>
          <small>أضف وعدّل منتجاتك</small>
        </button>

        <button
          class="so-action-btn"
          type="button"
          onclick="showView('soCategoriesView')">
          <span>📁</span>
          <strong>التصنيفات</strong>
          <small>نظّم قائمة الطعام</small>
        </button>

        <button
          class="so-action-btn"
          type="button"
          onclick="openStoreSettings()">
          <span>⚙️</span>
          <strong>الإعدادات</strong>
          <small>تعديل بيانات المتجر</small>
        </button>

      </div>
    </section>


    <!-- آخر الطلبات -->
    <section class="section">

      <div class="section-title">
        <h2>آخر الطلبات</h2>

        <button
          type="button"
          onclick="showView('soOrdersView')">
          عرض الكل →
        </button>
      </div>

      <div id="soRecentOrders">
        <div class="empty">
          <div class="spinner" style="margin:auto"></div>
        </div>
      </div>

    </section>
  `;

  /*
   * إذا كانت البيانات موجودة بالفعل، حمّل آخر الطلبات.
   */
  if (!soState.loadingRecentOrders) {
    loadRecentOrders();
  }
}


/* ============================================================
   تحديث الإحصائيات بدون إعادة رسم الصفحة
   ============================================================ */

function updateStoreStats() {
  const st = soState.stats;

  if (!st) return;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('soStatPending', st.pendingOrders || 0);
  set('soStatAccepted', st.acceptedOrders || 0);
  set('soStatPreparing', st.preparingOrders || 0);
  set('soStatReady', st.readyOrders || 0);
  set('soStatDelivered', st.deliveredOrders || 0);
  set('soStatCancelled', st.cancelledOrders || 0);

  set(
    'soStatRevenue',
    Number(st.totalRevenue || 0).toLocaleString('ar-YE')
  );

  const productsEl = document.getElementById('soStatProducts');

  if (productsEl) {
    productsEl.textContent = st.totalProducts || 0;

    const label = productsEl.parentElement
      ? productsEl.parentElement.querySelector('.so-stat-label')
      : null;

    if (label) {
      label.textContent =
        `إجمالي المنتجات (${st.availableProducts || 0} متوفر)`;
    }
  }
}


/* ============================================================
   فتح / إغلاق المتجر
   ============================================================ */

async function toggleStoreOpen() {
  const s = soState.store;

  if (!s) return;

  showLoading(
    s.isOpen
      ? 'جاري الإغلاق...'
      : 'جاري الفتح...'
  );

  try {
    const updated = await api('/store-owner/my-store', {
      method: 'PATCH',
      body: JSON.stringify({
        isOpen: !s.isOpen
      }),
    });

    soState.store = updated;

    toast(
      updated.isOpen
        ? 'المتجر مفتوح الآن'
        : 'المتجر مغلق'
    );

    renderStoreDashboard();

  } catch (e) {
    console.error('Toggle store error:', e);
    toast(humanError(e), 'error');

  } finally {
    hideLoading();
  }
}


/* ============================================================
   آخر الطلبات
   ============================================================ */

async function loadRecentOrders(silent = false) {
  const el = document.querySelector('#soRecentOrders');

  if (!el) return;

  if (soState.loadingRecentOrders) return;

  soState.loadingRecentOrders = true;

  if (!silent) {
    el.innerHTML = `
      <div class="empty">
        <div class="spinner" style="margin:auto"></div>
      </div>
    `;
  }

  try {
    const res = await api('/store-owner/orders?limit=5');

    const orders = res.items || [];

    if (!orders.length) {

      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📋</div>
          <strong>لا توجد طلبات بعد</strong>
          <p>ستظهر هنا عند استلام أول طلب</p>
        </div>
      `;

      return;
    }

    el.innerHTML = orders
      .map(o => renderStoreOrderCard(o))
      .join('');

  } catch (e) {

    console.error('Load recent orders error:', e);

    if (!silent) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <strong>تعذر تحميل الطلبات</strong>
        </div>
      `;
    }

  } finally {
    soState.loadingRecentOrders = false;
  }
}


/* ============================================================
   2) الطلبات
   ============================================================ */

async function loadStoreOrders() {
  const el = document.querySelector('#soOrdersList');

  if (!el) return;

  if (soState.loadingOrders) return;

  soState.loadingOrders = true;

  el.innerHTML = `
    <div class="empty">
      <div class="spinner" style="margin:auto"></div>
    </div>
  `;

  const params = new URLSearchParams({
    limit: '30'
  });

  if (soState.currentOrdersFilter) {
    params.set(
      'status',
      soState.currentOrdersFilter
    );
  }

  try {
    const res = await api(
      `/store-owner/orders?${params}`
    );

    soState.orders = res.items || [];

    renderStoreOrders();

  } catch (e) {

    console.error('Load store orders error:', e);

    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <strong>تعذر تحميل الطلبات</strong>
        <p>${escapeHtml(humanError(e))}</p>
      </div>
    `;

  } finally {
    soState.loadingOrders = false;
  }
}


function renderStoreOrders() {
  const el = document.querySelector('#soOrdersList');

  if (!el) return;

  const filtersHtml = `
    <div class="so-filters">

      <button
        class="so-filter ${!soState.currentOrdersFilter ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders(null)">
        الكل
      </button>

      <button
        class="so-filter ${soState.currentOrdersFilter === 'pending' ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders('pending')">
        جديد
      </button>

      <button
        class="so-filter ${soState.currentOrdersFilter === 'accepted' ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders('accepted')">
        مقبول
      </button>

      <button
        class="so-filter ${soState.currentOrdersFilter === 'preparing' ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders('preparing')">
        قيد التحضير
      </button>

      <button
        class="so-filter ${soState.currentOrdersFilter === 'ready' ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders('ready')">
        جاهز
      </button>

      <button
        class="so-filter ${soState.currentOrdersFilter === 'delivered' ? 'active' : ''}"
        type="button"
        onclick="soFilterOrders('delivered')">
        تم التوصيل
      </button>

    </div>
  `;

  if (!soState.orders.length) {

    el.innerHTML =
      filtersHtml +
      `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <strong>لا توجد طلبات</strong>
        <p>
          ${
            soState.currentOrdersFilter
              ? 'جرب فلترًا آخر'
              : 'ستظهر الطلبات هنا'
          }
        </p>
      </div>
      `;

    return;
  }

  el.innerHTML =
    filtersHtml +
    soState.orders
      .map(o => renderStoreOrderCard(o))
      .join('');
}


function soFilterOrders(status) {
  soState.currentOrdersFilter = status;

  loadStoreOrders();
}


function renderStoreOrderCard(o) {
  const status =
    SO_STATUS_LABELS[o.status] ||
    {
      label: o.status,
      color: 'info'
    };

  const timeAgo = formatTimeAgo(o.createdAt);

  const actions = [];

  if (o.status === 'pending') {

    actions.push(`
      <button
        class="btn btn-primary btn-small"
        type="button"
        onclick="event.stopPropagation(); soAcceptOrder('${o.id}')">
        ✅ قبول
      </button>
    `);

    actions.push(`
      <button
        class="btn btn-danger btn-small"
        type="button"
        onclick="event.stopPropagation(); soRejectOrder('${o.id}')">
        ❌ رفض
      </button>
    `);

  } else if (o.status === 'accepted') {

    actions.push(`
      <button
        class="btn btn-primary btn-small"
        type="button"
        onclick="event.stopPropagation(); soMarkPreparing('${o.id}')">
        👨‍🍳 بدء التحضير
      </button>
    `);

  } else if (o.status === 'preparing') {

    actions.push(`
      <button
        class="btn btn-primary btn-small"
        type="button"
        onclick="event.stopPropagation(); soMarkReady('${o.id}')">
        ✅ جاهز للاستلام
      </button>
    `);
  }

  return `
    <div
      class="so-order-card status-border-${status.color}"
      onclick="openStoreOrderDetails('${o.id}')">

      <div class="so-order-head">

        <div>
          <strong>${escapeHtml(o.orderNumber)}</strong>
          <small>${escapeHtml(o.recipientName)}</small>
        </div>

        <span class="status status-${status.color}">
          ${status.label}
        </span>

      </div>

      <div class="so-order-body">
        <div>
          📦 ${(o.items || []).length} منتج
        </div>

        <div>
          💰
          <strong style="color:#86efac">
            ${formatPrice(o.total)}
          </strong>
        </div>

        <div>
          ⏱️ ${timeAgo}
        </div>
      </div>

      ${
        actions.length
          ? `<div class="so-order-actions">${actions.join('')}</div>`
          : ''
      }

    </div>
  `;
}


/* ============================================================
   تفاصيل الطلب
   ============================================================ */

async function openStoreOrderDetails(orderId) {
  showView('soOrderDetailsView');

  const el =
    document.querySelector('#soOrderDetailsContent');

  if (el) {
    el.innerHTML = `
      <div class="empty">
        <div class="spinner" style="margin:auto"></div>
      </div>
    `;
  }

  try {

    const order =
      await api(`/store-owner/orders/${orderId}`);

    renderStoreOrderDetails(order);

  } catch (e) {

    console.error(
      'Store order details error:',
      e
    );

    if (el) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <strong>تعذر تحميل الطلب</strong>
          <p>${escapeHtml(humanError(e))}</p>
        </div>
      `;
    }
  }
}


function renderStoreOrderDetails(order) {
  const el =
    document.querySelector('#soOrderDetailsContent');

  if (!el) return;

  const status =
    SO_STATUS_LABELS[order.status] ||
    {
      label: order.status,
      color: 'info'
    };

  const actions = [];

  if (order.status === 'pending') {

    actions.push(`
      <button
        class="btn btn-primary full"
        type="button"
        onclick="soAcceptOrder('${order.id}')">
        ✅ قبول الطلب
      </button>
    `);

    actions.push(`
      <button
        class="btn btn-danger full"
        type="button"
        style="margin-top:10px"
        onclick="soRejectOrder('${order.id}')">
        ❌ رفض الطلب
      </button>
    `);

  } else if (order.status === 'accepted') {

    actions.push(`
      <button
        class="btn btn-primary full"
        type="button"
        onclick="soMarkPreparing('${order.id}')">
        👨‍🍳 بدء التحضير
      </button>
    `);

  } else if (order.status === 'preparing') {

    actions.push(`
      <button
        class="btn btn-primary full"
        type="button"
        onclick="soMarkReady('${order.id}')">
        ✅ جاهز للاستلام
      </button>
    `);
  }

  el.innerHTML = `

    <section class="section">

      <div class="order-details-header">

        <div>
          <h1>${escapeHtml(order.orderNumber)}</h1>

          <p style="color:var(--muted);margin-top:6px">
            ${formatTimeAgo(order.createdAt)}
          </p>
        </div>

        <span class="status status-${status.color}">
          ${status.label}
        </span>

      </div>

    </section>


    <section class="section">

      <div class="section-title">
        <h2>العميل</h2>
      </div>

      <div class="info-card">

        <p>
          <strong>👤 الاسم:</strong>
          ${escapeHtml(order.recipientName)}
        </p>

        <p style="margin-top:6px">
          <strong>📱 الهاتف:</strong>
          ${escapeHtml(order.recipientPhone)}
        </p>

        <p style="margin-top:6px">
          <strong>📍 العنوان:</strong><br>
          ${escapeHtml(order.deliveryAddressText)}
        </p>

        ${
          order.customerNotes
            ? `
              <p style="margin-top:10px">
                <strong>📝 ملاحظات العميل:</strong>
                ${escapeHtml(order.customerNotes)}
              </p>
            `
            : ''
        }

      </div>

    </section>


    <section class="section">

      <div class="section-title">
        <h2>المنتجات</h2>
      </div>

      ${(order.items || [])
        .map(i => `
          <div class="order-item-row">

            <div>

              <strong>
                ${escapeHtml(i.productName)}
              </strong>

              ${
                i.variantName
                  ? `<small>${escapeHtml(i.variantName)}</small>`
                  : ''
              }

              ${
                i.notes
                  ? `
                    <p style="font-size:12px;color:var(--muted);margin-top:4px">
                      📝 ${escapeHtml(i.notes)}
                    </p>
                  `
                  : ''
              }

            </div>

            <div style="text-align:left">

              <div>
                ${i.quantity} × ${formatPrice(i.unitPrice)}
              </div>

              <strong style="color:#86efac">
                ${formatPrice(i.lineTotal)}
              </strong>

            </div>

          </div>
        `)
        .join('')}


      <div class="cart-summary" style="margin-top:16px">

        <div class="summary-row">
          <span>المنتجات</span>
          <strong>${formatPrice(order.subtotal)}</strong>
        </div>

        <div class="summary-row">
          <span>التوصيل</span>
          <strong>${formatPrice(order.deliveryFee)}</strong>
        </div>

        ${
          order.discountTotal > 0
            ? `
              <div class="summary-row">
                <span>الخصم</span>
                <strong>
                  -${formatPrice(order.discountTotal)}
                </strong>
              </div>
            `
            : ''
        }

        <div class="summary-row total">
          <span>الإجمالي</span>
          <strong>${formatPrice(order.total)}</strong>
        </div>

      </div>

    </section>


    ${
      actions.length
        ? `
          <section class="section">

            <div class="section-title">
              <h2>الإجراءات</h2>
            </div>

            ${actions.join('')}

          </section>
        `
        : ''
    }


    <button
      class="btn btn-secondary full"
      type="button"
      style="margin-top:12px"
      onclick="showView('soOrdersView')">
      ← رجوع للطلبات
    </button>
  `;
}


/* ============================================================
   3) أفعال الطلبات
   ============================================================ */

async function soAcceptOrder(orderId) {
  showLoading('جاري القبول...');

  try {

    await api(
      `/store-owner/orders/${orderId}/accept`,
      { method: 'PATCH' }
    );

    toast('تم قبول الطلب');

    await openStoreOrderDetails(orderId);

  } catch (e) {

    console.error(
      'Accept order error:',
      e
    );

    toast(humanError(e), 'error');

  } finally {
    hideLoading();
  }
}


async function soRejectOrder(orderId) {
  const reason =
    prompt(
      'سبب الرفض:',
      'المنتج غير متوفر'
    );

  if (reason === null) return;

  showLoading('جاري الرفض...');

  try {

    await api(
      `/store-owner/orders/${orderId}/reject`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reason:
            reason ||
            'مرفوض من المتجر'
        }),
      }
    );

    toast('تم رفض الطلب');

    await openStoreOrderDetails(orderId);

  } catch (e) {

    console.error(
      'Reject order error:',
      e
    );

    toast(humanError(e), 'error');

  } finally {
    hideLoading();
  }
}


async function soMarkPreparing(orderId) {
  showLoading('جاري التحديث...');

  try {

    await api(
      `/store-owner/orders/${orderId}/preparing`,
      { method: 'PATCH' }
    );

    toast('بدأ التحضير');

    await openStoreOrderDetails(orderId);

  } catch (e) {

    console.error(
      'Mark preparing error:',
      e
    );

    toast(humanError(e), 'error');

  } finally {
    hideLoading();
  }
}


async function soMarkReady(orderId) {
  showLoading('جاري التحديث...');

  try {

    await api(
      `/store-owner/orders/${orderId}/ready`,
      { method: 'PATCH' }
    );

    toast('الطلب جاهز للاستلام');

    await openStoreOrderDetails(orderId);

  } catch (e) {

    console.error(
      'Mark ready error:',
      e
    );

    toast(humanError(e), 'error');

  } finally {
    hideLoading();
  }
}


/* ============================================================
   4) المنتجات
   ============================================================ */

async function loadStoreProducts() {
  const el =
    document.querySelector('#soProductsList');

  if (!el) return;

  if (soState.loadingProducts) return;

  soState.loadingProducts = true;

  el.innerHTML = `
    <div class="empty">
      <div class="spinner" style="margin:auto"></div>
    </div>
  `;

  try {

    const [productsRes, catsRes] =
      await Promise.all([
        api('/store-owner/products?limit=100'),
        api('/store-owner/categories'),
      ]);

    soState.products =
      productsRes.items || [];

    soState.categories =
      catsRes || [];

    renderStoreProducts();

  } catch (e) {

    console.error(
      'Load store products error:',
      e
    );

    el.innerHTML = `
      <div class="empty">

        <div class="empty-icon">⚠️</div>

        <strong>
          تعذر تحميل المنتجات
        </strong>

        <p>
          ${escapeHtml(humanError(e))}
        </p>

      </div>
    `;

  } finally {
    soState.loadingProducts = false;
  }
}


function renderStoreProducts() {
  const el =
    document.querySelector('#soProductsList');

  if (!el) return;

  const headerHtml = `
    <div class="so-page-header">

      <button
        class="btn btn-primary btn-small"
        type="button"
        onclick="openProductModal()">
        + منتج جديد
      </button>

      <span class="so-count">
        ${soState.products.length} منتج
      </span>

    </div>
  `;

  if (!soState.products.length) {

    el.innerHTML =
      headerHtml +
      `
      <div class="empty">

        <div class="empty-icon">🍽️</div>

        <strong>
          لا توجد منتجات
        </strong>

        <p>
          أضف أول منتج لقائمتك
        </p>

        <button
          class="btn btn-primary"
          style="margin-top:16px"
          type="button"
          onclick="openProductModal()">
          + إضافة منتج
        </button>

      </div>
      `;

    return;
  }

  el.innerHTML =
    headerHtml +
    soState.products
      .map(p => `

        <div class="so-product-row">

          <div
            class="so-product-image"
            style="${
              p.imageUrl
                ? `background-image:url('${escapeHtml(p.imageUrl)}')`
                : ''
            }">

            ${p.imageUrl ? '' : '🍽️'}

          </div>

          <div class="so-product-info">

            <strong>
              ${escapeHtml(p.nameAr)}
            </strong>

            <small>
              ${escapeHtml(p.nameEn)}
            </small>

            <div class="so-product-meta">

              <span class="price">
                ${formatPrice(p.basePrice)}
              </span>

              <span
                class="so-pill ${p.isAvailable ? 'ok' : 'off'}">
                ${p.isAvailable ? 'متوفر' : 'غير متوفر'}
              </span>

            </div>

          </div>

          <div class="so-product-actions">

            <button
              class="icon-btn-small"
              type="button"
              onclick="openProductModal('${p.id}')"
              title="تعديل">
              ✏️
            </button>

            <button
              class="icon-btn-small danger"
              type="button"
              onclick="soDeleteProduct('${p.id}')"
              title="حذف">
              🗑️
            </button>

          </div>

        </div>

      `)
      .join('');
}


function openProductModal(productId) {
  soState.editingProductId =
    productId || null;

  const existing = productId
    ? soState.products.find(
        p => p.id === productId
      )
    : null;

  const title =
    document.querySelector(
      '#soProductModalTitle'
    );

  if (title) {
    title.textContent =
      existing
        ? 'تعديل منتج'
        : 'منتج جديد';
  }

  const setValue = (id, value) => {
    const el =
      document.querySelector(id);

    if (el) el.value = value;
  };

  setValue(
    '#soProductId',
    existing?.id || ''
  );

  setValue(
    '#soProductNameAr',
    existing?.nameAr || ''
  );

  setValue(
    '#soProductNameEn',
    existing?.nameEn || ''
  );

  setValue(
    '#soProductDescAr',
    existing?.descriptionAr || ''
  );

  setValue(
    '#soProductPrice',
    existing?.basePrice || ''
  );

  setValue(
    '#soProductImageUrl',
    existing?.imageUrl || ''
  );

  setValue(
    '#soProductSortOrder',
    existing?.sortOrder || 0
  );

  const available =
    document.querySelector(
      '#soProductIsAvailable'
    );

  if (available) {
    available.checked =
      existing
        ? existing.isAvailable
        : true;
  }

  const catSelect =
    document.querySelector(
      '#soProductCategory'
    );

  if (catSelect) {

    catSelect.innerHTML =
      '<option value="">بدون تصنيف</option>' +
      soState.categories
        .map(c => `
          <option
            value="${c.id}"
            ${
              existing?.categoryId === c.id
                ? 'selected'
                : ''
            }>
            ${escapeHtml(c.nameAr)}
          </option>
        `)
        .join('');
  }

  const modal =
    document.querySelector(
      '#soProductModal'
    );

  if (modal) {
    modal.classList.remove('hidden');
  }
}


function closeProductModal() {
  const modal =
    document.querySelector(
      '#soProductModal'
    );

  if (modal) {
    modal.classList.add('hidden');
  }

  const form =
    document.querySelector(
      '#soProductForm'
    );

  if (form) {
    form.reset();
  }

  soState.editingProductId = null;
}


async function submitProductForm(event) {
  event.preventDefault();

  const id =
    document.querySelector(
      '#soProductId'
    ).value;

  const payload = {
    nameAr:
      document.querySelector(
        '#soProductNameAr'
      ).value.trim(),

    nameEn:
      document.querySelector(
        '#soProductNameEn'
      ).value.trim(),

    descriptionAr:
      document.querySelector(
        '#soProductDescAr'
      ).value.trim() || undefined,

    basePrice:
      parseFloat(
        document.querySelector(
          '#soProductPrice'
        ).value
      ),

    imageUrl:
      document.querySelector(
        '#soProductImageUrl'
      ).value.trim() || undefined,

    isAvailable:
      document.querySelector(
        '#soProductIsAvailable'
      ).checked,

    sortOrder:
      parseInt(
        document.querySelector(
          '#soProductSortOrder'
        ).value
      ) || 0,
  };

  const catId =
    document.querySelector(
      '#soProductCategory'
    ).value;

  if (catId) {
    payload.categoryId = catId;
  }

  if (
    !payload.nameAr ||
    !payload.nameEn ||
    !payload.basePrice
  ) {
    toast(
      'املأ الحقول الإلزامية',
      'error'
    );

    return;
  }

  showLoading(
    id
      ? 'جاري التحديث...'
      : 'جاري الإنشاء...'
  );

  try {

    if (id) {

      await api(
        `/store-owner/products/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      toast('تم تحديث المنتج');

    } else {

      await api(
        '/store-owner/products',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      toast('تم إنشاء المنتج');
    }

    closeProductModal();

    await loadStoreProducts();

  } catch (e) {

    console.error(
      'Save product error:',
      e
    );

    toast(
      humanError(e),
      'error'
    );

  } finally {
    hideLoading();
  }
}


async function soDeleteProduct(productId) {
  if (!confirm('هل تريد حذف هذا المنتج؟')) {
    return;
  }

  showLoading('جاري الحذف...');

  try {

    await api(
      `/store-owner/products/${productId}`,
      {
        method: 'DELETE'
      }
    );

    toast('تم حذف المنتج');

    await loadStoreProducts();

  } catch (e) {

    console.error(
      'Delete product error:',
      e
    );

    toast(
      humanError(e),
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* ============================================================
   5) التصنيفات
   ============================================================ */

async function loadStoreCategories() {
  const el =
    document.querySelector(
      '#soCategoriesList'
    );

  if (!el) return;

  if (soState.loadingCategories) {
    return;
  }

  soState.loadingCategories = true;

  el.innerHTML = `
    <div class="empty">
      <div class="spinner" style="margin:auto"></div>
    </div>
  `;

  try {

    const cats =
      await api(
        '/store-owner/categories'
      );

    soState.categories =
      cats || [];

    renderStoreCategories();

  } catch (e) {

    console.error(
      'Load categories error:',
      e
    );

    el.innerHTML = `
      <div class="empty">

        <div class="empty-icon">⚠️</div>

        <strong>
          تعذر تحميل التصنيفات
        </strong>

      </div>
    `;

  } finally {
    soState.loadingCategories = false;
  }
}


function renderStoreCategories() {
  const el =
    document.querySelector(
      '#soCategoriesList'
    );

  if (!el) return;

  const headerHtml = `
    <div class="so-page-header">

      <button
        class="btn btn-primary btn-small"
        type="button"
        onclick="openCategoryModal()">
        + تصنيف جديد
      </button>

      <span class="so-count">
        ${soState.categories.length} تصنيف
      </span>

    </div>
  `;

  if (!soState.categories.length) {

    el.innerHTML =
      headerHtml +
      `
      <div class="empty">

        <div class="empty-icon">📁</div>

        <strong>
          لا توجد تصنيفات
        </strong>

        <p>
          أنشئ تصنيفات لتنظيم قائمتك
        </p>

      </div>
      `;

    return;
  }

  el.innerHTML =
    headerHtml +
    soState.categories
      .map(c => `
        <div class="so-category-row">

          <span class="so-category-icon">
            📁
          </span>

          <div class="so-category-info">

            <strong>
              ${escapeHtml(c.nameAr)}
            </strong>

            <small>
              ${escapeHtml(c.nameEn)}
            </small>

          </div>

        </div>
      `)
      .join('');
}


function openCategoryModal() {
  const form =
    document.querySelector(
      '#soCategoryForm'
    );

  if (form) {
    form.reset();
  }

  const modal =
    document.querySelector(
      '#soCategoryModal'
    );

  if (modal) {
    modal.classList.remove('hidden');
  }
}


function closeCategoryModal() {
  const modal =
    document.querySelector(
      '#soCategoryModal'
    );

  if (modal) {
    modal.classList.add('hidden');
  }
}


async function submitCategoryForm(event) {
  event.preventDefault();

  const payload = {
    nameAr:
      document.querySelector(
        '#soCategoryNameAr'
      ).value.trim(),

    nameEn:
      document.querySelector(
        '#soCategoryNameEn'
      ).value.trim(),

    sortOrder:
      parseInt(
        document.querySelector(
          '#soCategorySortOrder'
        ).value
      ) || 0,
  };

  if (
    !payload.nameAr ||
    !payload.nameEn
  ) {
    toast(
      'املأ الحقول الإلزامية',
      'error'
    );

    return;
  }

  showLoading('جاري الإنشاء...');

  try {

    await api(
      '/store-owner/categories',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    toast('تم إنشاء التصنيف');

    closeCategoryModal();

    await loadStoreCategories();

  } catch (e) {

    console.error(
      'Create category error:',
      e
    );

    toast(
      humanError(e),
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* ============================================================
   6) إعدادات المتجر
   ============================================================ */

function openStoreSettings() {
  const s = soState.store;

  if (!s) return;

  const setValue = (id, value) => {
    const el =
      document.querySelector(id);

    if (el) {
      el.value = value;
    }
  };

  setValue(
    '#soSettingsNameAr',
    s.nameAr || ''
  );

  setValue(
    '#soSettingsNameEn',
    s.nameEn || ''
  );

  setValue(
    '#soSettingsDescAr',
    s.descriptionAr || ''
  );

  setValue(
    '#soSettingsPhone',
    s.phone || ''
  );

  setValue(
    '#soSettingsAddress',
    s.addressText || ''
  );

  setValue(
    '#soSettingsDeliveryFee',
    s.deliveryFee || 0
  );

  setValue(
    '#soSettingsMinOrder',
    s.minOrderAmount || 0
  );

  setValue(
    '#soSettingsPrepMinutes',
    s.avgPrepMinutes || 20
  );

  const accepts =
    document.querySelector(
      '#soSettingsAcceptsOrders'
    );

  if (accepts) {
    accepts.checked =
      !!s.acceptsOrders;
  }

  const modal =
    document.querySelector(
      '#soSettingsModal'
    );

  if (modal) {
    modal.classList.remove('hidden');
  }
}


function closeStoreSettings() {
  const modal =
    document.querySelector(
      '#soSettingsModal'
    );

  if (modal) {
    modal.classList.add('hidden');
  }
}


async function submitStoreSettings(event) {
  event.preventDefault();

  const payload = {
    nameAr:
      document.querySelector(
        '#soSettingsNameAr'
      ).value.trim() || undefined,

    nameEn:
      document.querySelector(
        '#soSettingsNameEn'
      ).value.trim() || undefined,

    descriptionAr:
      document.querySelector(
        '#soSettingsDescAr'
      ).value.trim() || undefined,

    phone:
      document.querySelector(
        '#soSettingsPhone'
      ).value.trim() || undefined,

    addressText:
      document.querySelector(
        '#soSettingsAddress'
      ).value.trim() || undefined,

    deliveryFee:
      parseFloat(
        document.querySelector(
          '#soSettingsDeliveryFee'
        ).value
      ) || 0,

    minOrderAmount:
      parseFloat(
        document.querySelector(
          '#soSettingsMinOrder'
        ).value
      ) || 0,

    avgPrepMinutes:
      parseInt(
        document.querySelector(
          '#soSettingsPrepMinutes'
        ).value
      ) || 20,

    acceptsOrders:
      document.querySelector(
        '#soSettingsAcceptsOrders'
      ).checked,
  };

  showLoading('جاري الحفظ...');

  try {

    const updated =
      await api(
        '/store-owner/my-store',
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );

    soState.store = updated;

    toast('تم حفظ الإعدادات');

    closeStoreSettings();

    renderStoreDashboard();

  } catch (e) {

    console.error(
      'Save settings error:',
      e
    );

    toast(
      humanError(e),
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* ============================================================
   7) Helpers
   ============================================================ */

const SO_STATUS_LABELS = {

  pending: {
    label: 'بانتظار التأكيد',
    color: 'warning'
  },

  accepted: {
    label: 'تم القبول',
    color: 'info'
  },

  rejected: {
    label: 'مرفوض',
    color: 'danger'
  },

  preparing: {
    label: 'قيد التحضير',
    color: 'info'
  },

  ready: {
    label: 'جاهز للاستلام',
    color: 'info'
  },

  driverAssigned: {
    label: 'مندوب معيَّن',
    color: 'info'
  },

  driverGoingToStore: {
    label: 'المندوب متجه',
    color: 'info'
  },

  driverArrivedStore: {
    label: 'المندوب وصل',
    color: 'info'
  },

  pickedUp: {
    label: 'تم الاستلام',
    color: 'info'
  },

  driverGoingToCustomer: {
    label: 'في الطريق',
    color: 'info'
  },

  driverArrivedCustomer: {
    label: 'وصل للعميل',
    color: 'info'
  },

  delivered: {
    label: 'تم التوصيل',
    color: 'success'
  },

  cancelled: {
    label: 'ملغي',
    color: 'danger'
  },

};


function formatTimeAgo(iso) {
  try {

    const diff =
      (Date.now() -
        new Date(iso).getTime()) /
      1000;

    if (diff < 60) {
      return 'الآن';
    }

    if (diff < 3600) {
      return `قبل ${Math.floor(diff / 60)} دقيقة`;
    }

    if (diff < 86400) {
      return `قبل ${Math.floor(diff / 3600)} ساعة`;
    }

    return `قبل ${Math.floor(diff / 86400)} يوم`;

  } catch {

    return iso;
  }
}


/* ============================================================
   8) Export
   ============================================================ */

window.openStoreDashboard =
  openStoreDashboard;

window.toggleStoreOpen =
  toggleStoreOpen;

window.loadStoreOrders =
  loadStoreOrders;

window.soFilterOrders =
  soFilterOrders;

window.openStoreOrderDetails =
  openStoreOrderDetails;

window.soAcceptOrder =
  soAcceptOrder;

window.soRejectOrder =
  soRejectOrder;

window.soMarkPreparing =
  soMarkPreparing;

window.soMarkReady =
  soMarkReady;

window.loadStoreProducts =
  loadStoreProducts;

window.openProductModal =
  openProductModal;

window.closeProductModal =
  closeProductModal;

window.submitProductForm =
  submitProductForm;

window.soDeleteProduct =
  soDeleteProduct;

window.loadStoreCategories =
  loadStoreCategories;

window.openCategoryModal =
  openCategoryModal;

window.closeCategoryModal =
  closeCategoryModal;

window.submitCategoryForm =
  submitCategoryForm;

window.openStoreSettings =
  openStoreSettings;

window.closeStoreSettings =
  closeStoreSettings;

window.submitStoreSettings =
  submitStoreSettings;
