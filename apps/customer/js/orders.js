/* ============================================================
   ABSHER BI — orders.js
   قائمة الطلبات + تفاصيل طلب + إلغاء
   ============================================================ */

const ORDER_STATUS_LABELS = {
  pending:                { label: 'بانتظار التأكيد',  color: 'warning' },
  accepted:               { label: 'تم القبول',        color: 'info' },
  rejected:               { label: 'مرفوض',            color: 'danger' },
  preparing:              { label: 'قيد التحضير',      color: 'info' },
  ready:                  { label: 'جاهز للاستلام',    color: 'info' },
  driverAssigned:         { label: 'تم تعيين مندوب',   color: 'info' },
  driverGoingToStore:     { label: 'المندوب متجه للمتجر', color: 'info' },
  driverArrivedStore:     { label: 'المندوب وصل المتجر', color: 'info' },
  pickedUp:               { label: 'تم الاستلام',      color: 'info' },
  driverGoingToCustomer:  { label: 'في الطريق إليك',   color: 'info' },
  driverArrivedCustomer:  { label: 'وصل المندوب',      color: 'info' },
  delivered:              { label: 'تم التوصيل',       color: 'success' },
  cancelled:              { label: 'ملغي',             color: 'danger' },
};

async function loadOrders() {
  const el = document.querySelector('#ordersList');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    const res = await api('/orders/my?limit=30');
    renderOrders(res.items || []);
  } catch (e) {
    console.error('Load orders error:', e);
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <strong>تعذر تحميل الطلبات</strong>
        <p>${escapeHtml(humanError(e))}</p>
      </div>`;
  }
}

function renderOrders(orders) {
  const el = document.querySelector('#ordersList');
  if (!el) return;

  if (!orders.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🛍️</div>
        <strong>لا توجد طلبات</strong>
        <p>ابدأ بتصفح المتاجر وإنشاء أول طلب</p>
        <button class="btn btn-primary" style="margin-top:16px" type="button"
          onclick="showView('storesView')">
          تصفح المتاجر
        </button>
      </div>`;
    return;
  }

  el.innerHTML = orders.map((o) => {
    const status = ORDER_STATUS_LABELS[o.status] || { label: o.status, color: 'info' };
    return `
      <div class="order-card" onclick="openOrderDetails('${o.id}')">
        <div class="order-head">
          <div>
            <strong>${escapeHtml(o.orderNumber)}</strong>
            <small style="display:block;color:var(--muted);margin-top:4px">
              ${escapeHtml(o.storeName || '')}
            </small>
          </div>
          <span class="status status-${status.color}">${status.label}</span>
        </div>
        <div class="order-body">
          <div>📦 ${(o.items || []).length} منتج</div>
          <div>💰 الإجمالي: <strong style="color:#86efac">${formatPrice(o.total)}</strong></div>
          <div>📅 ${formatDate(o.createdAt)}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function openOrderDetails(orderId) {
  showView('orderDetailsView');
  const el = document.querySelector('#orderDetailsContent');
  if (el) el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    const order = await api(`/orders/my/${orderId}`);
    renderOrderDetails(order);
  } catch (e) {
    console.error('Order details error:', e);
    if (el) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <strong>تعذر تحميل الطلب</strong>
          <p>${escapeHtml(humanError(e))}</p>
        </div>`;
    }
  }
}

function renderOrderDetails(order) {
  const el = document.querySelector('#orderDetailsContent');
  if (!el) return;

  const status = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: 'info' };
  const canCancel = ['pending', 'accepted'].includes(order.status);

  el.innerHTML = `
    <section class="section">
      <div class="order-details-header">
        <div>
          <h1>${escapeHtml(order.orderNumber)}</h1>
          <p style="color:var(--muted);margin-top:6px">🏪 ${escapeHtml(order.storeName || '')}</p>
        </div>
        <span class="status status-${status.color}">${status.label}</span>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>المنتجات</h2></div>
      ${(order.items || []).map((i) => `
        <div class="order-item-row">
          <div>
            <strong>${escapeHtml(i.productName)}</strong>
            ${i.variantName ? `<small>${escapeHtml(i.variantName)}</small>` : ''}
            ${i.notes ? `<p style="font-size:12px;color:var(--muted);margin-top:4px">📝 ${escapeHtml(i.notes)}</p>` : ''}
          </div>
          <div style="text-align:left">
            <div>${i.quantity} × ${formatPrice(i.unitPrice)}</div>
            <strong style="color:#86efac">${formatPrice(i.lineTotal)}</strong>
          </div>
        </div>
      `).join('')}

      <div class="cart-summary" style="margin-top:16px">
        <div class="summary-row">
          <span>المنتجات</span>
          <strong>${formatPrice(order.subtotal)}</strong>
        </div>
        <div class="summary-row">
          <span>التوصيل</span>
          <strong>${formatPrice(order.deliveryFee)}</strong>
        </div>
        ${order.discountTotal > 0 ? `
          <div class="summary-row">
            <span>الخصم</span>
            <strong>-${formatPrice(order.discountTotal)}</strong>
          </div>` : ''}
        <div class="summary-row total">
          <span>الإجمالي</span>
          <strong>${formatPrice(order.total)}</strong>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>تفاصيل التسليم</h2></div>
      <div class="info-card">
        <p><strong>📍 العنوان:</strong><br>${escapeHtml(order.deliveryAddressText)}</p>
        <p style="margin-top:10px"><strong>👤 المستلم:</strong> ${escapeHtml(order.recipientName)}</p>
        <p><strong>📱 الهاتف:</strong> ${escapeHtml(order.recipientPhone)}</p>
        <p style="margin-top:10px"><strong>💵 الدفع:</strong> نقد عند الاستلام</p>
        ${order.customerNotes ? `<p style="margin-top:10px"><strong>📝 ملاحظات:</strong> ${escapeHtml(order.customerNotes)}</p>` : ''}
      </div>
    </section>

    ${canCancel ? `
      <div style="margin-top:20px">
        <button class="btn btn-danger full" type="button" onclick="cancelOrder('${order.id}')">
          ❌ إلغاء الطلب
        </button>
      </div>` : ''}

    <button class="btn btn-secondary full" type="button"
      style="margin-top:12px" onclick="showView('ordersView')">
      ← رجوع لطلباتي
    </button>
  `;
}

async function cancelOrder(orderId) {
  const reason = prompt('سبب الإلغاء (اختياري):', 'غيّرت رأيي');
  if (reason === null) return;

  showLoading('جاري الإلغاء...');
  try {
    await api(`/orders/my/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason: reason || 'بدون سبب' }),
    });
    toast('تم إلغاء الطلب');
    await openOrderDetails(orderId);
  } catch (e) {
    console.error('Cancel order error:', e);
    toast(humanError(e), 'error');
  } finally {
    hideLoading();
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('ar-YE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

window.loadOrders = loadOrders;
window.openOrderDetails = openOrderDetails;
window.cancelOrder = cancelOrder;
