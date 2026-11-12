/* ============================================================
   ABSHER BI — checkout.js
   صفحة إتمام الطلب
   ============================================================ */

let checkoutState = {
  addresses: [],
  selectedAddressId: null,
  notes: '',
  submitting: false,
};

async function openCheckout() {
  if (!state.cart.length) {
    toast('السلة فارغة', 'error');
    return;
  }

  showView('checkoutView');
  const el = document.querySelector('#checkoutContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    const list = await api('/addresses');
    checkoutState.addresses = Array.isArray(list) ? list : [];

    if (!checkoutState.addresses.length) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">📍</div>
          <strong>لا توجد عناوين محفوظة</strong>
          <p>أضف عنوانًا لتتمكن من إتمام الطلب</p>
          <button class="btn btn-primary" style="margin-top:16px" type="button"
            onclick="showView('addressesView'); openAddressModal();">
            + إضافة عنوان
          </button>
        </div>`;
      return;
    }

    // اختر العنوان الافتراضي
    const def = checkoutState.addresses.find((a) => a.isDefault) || checkoutState.addresses[0];
    checkoutState.selectedAddressId = def.id;

    renderCheckout();
  } catch (e) {
    console.error('Open checkout error:', e);
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <strong>تعذر تحميل البيانات</strong>
        <p>${escapeHtml(humanError(e))}</p>
      </div>`;
  }
}

function renderCheckout() {
  const el = document.querySelector('#checkoutContent');
  if (!el) return;

  const subtotal = state.cart.reduce((t, i) => t + Number(i.price) * i.quantity, 0);
  const deliveryFee = 500;
  const total = subtotal + deliveryFee;

  el.innerHTML = `
    <section class="section">
      <div class="section-title"><h2>عنوان التسليم</h2></div>
      <div class="addresses-picker">
        ${checkoutState.addresses.map((a) => `
          <div class="address-pick ${a.id === checkoutState.selectedAddressId ? 'selected' : ''}"
               onclick="selectCheckoutAddress('${a.id}')">
            <strong>
              📍 ${escapeHtml(a.label || 'عنوان')}
              ${a.isDefault ? '<span class="address-badge">افتراضي</span>' : ''}
            </strong>
            <p>${escapeHtml(a.addressLine)}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>طريقة الدفع</h2></div>
      <div class="payment-option selected">
        <span style="font-size:24px">💵</span>
        <div>
          <strong>نقد عند الاستلام</strong>
          <small>تدفع عند وصول الطلب</small>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><h2>ملاحظات الطلب</h2></div>
      <textarea id="checkoutNotes"
        placeholder="مثلاً: لا تقرع الجرس، اتصل عند الوصول..."
        maxlength="500">${escapeHtml(checkoutState.notes || '')}</textarea>
    </section>

    <section class="section">
      <div class="cart-summary">
        <div class="summary-row">
          <span>المنتجات (${state.cart.reduce((t, i) => t + i.quantity, 0)})</span>
          <strong>${formatPrice(subtotal)}</strong>
        </div>
        <div class="summary-row">
          <span>التوصيل</span>
          <strong>${formatPrice(deliveryFee)}</strong>
        </div>
        <div class="summary-row total">
          <span>الإجمالي</span>
          <strong>${formatPrice(total)}</strong>
        </div>
      </div>
    </section>

    <div style="margin-top:20px">
      <button class="btn btn-primary full" type="button" onclick="submitOrder()"
        id="submitOrderBtn">
        🛒 تأكيد الطلب
      </button>
      <button class="btn btn-secondary full" type="button"
        style="margin-top:10px" onclick="showView('cartView')">
        ← رجوع للسلة
      </button>
    </div>
  `;
}

function selectCheckoutAddress(id) {
  checkoutState.selectedAddressId = id;
  // أعد الرسم مع الحفاظ على الملاحظات
  const notesEl = document.querySelector('#checkoutNotes');
  if (notesEl) checkoutState.notes = notesEl.value;
  renderCheckout();
}

async function submitOrder() {
  if (checkoutState.submitting) return;

  const notesEl = document.querySelector('#checkoutNotes');
  const notes = notesEl ? notesEl.value.trim() : '';
  const addressId = checkoutState.selectedAddressId;

  if (!addressId) {
    toast('اختر عنوانًا للتسليم', 'error');
    return;
  }
  if (!state.cart.length) {
    toast('السلة فارغة', 'error');
    return;
  }

  // استخرج storeId من أول منتج في السلة (يجب أن تكون كل المنتجات من نفس المتجر)
  const storeId = state.cart[0].storeId;
  if (!storeId) {
    toast('خطأ: المنتجات لا تحتوي storeId', 'error');
    return;
  }

  // تحقق أن كل المنتجات من نفس المتجر
  const allSameStore = state.cart.every((i) => i.storeId === storeId);
  if (!allSameStore) {
    toast('لا يمكن إنشاء طلب من عدة متاجر. اختر منتجات من متجر واحد.', 'error');
    return;
  }

  const idempotencyKey =
    'order-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

  const payload = {
    storeId,
    addressId,
    customerNotes: notes || undefined,
    idempotencyKey,
    items: state.cart.map((i) => ({
      productId: i.id,
      quantity: i.quantity,
    })),
  };

  checkoutState.submitting = true;
  const btn = document.querySelector('#submitOrderBtn');
  if (btn) btn.disabled = true;
  showLoading('جاري إنشاء الطلب...');

  try {
    const order = await api('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // نظّف السلة
    state.cart = [];
    saveCart();
    updateCartBadge();

    toast(`تم إنشاء الطلب ${order.orderNumber} بنجاح`);

    // افتح تفاصيل الطلب
    setTimeout(() => {
      showView('ordersView');
      openOrderDetails(order.id);
    }, 800);
  } catch (e) {
    console.error('Submit order error:', e);
    toast(humanError(e), 'error');
  } finally {
    checkoutState.submitting = false;
    if (btn) btn.disabled = false;
    hideLoading();
  }
}

window.openCheckout = openCheckout;
window.selectCheckoutAddress = selectCheckoutAddress;
window.submitOrder = submitOrder;
