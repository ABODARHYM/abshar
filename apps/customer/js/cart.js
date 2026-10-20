/* ============================================================
   ABSHER BI — cart.js
   السلة (localStorage) + دعم storeId
   ============================================================ */

function saveCart() {
  localStorage.setItem(STORAGE.cart, JSON.stringify(state.cart));
}

function addToCart(product) {
  // product: { id, name, price, icon, storeId }
  if (!product.storeId) {
    console.warn('[cart] addToCart without storeId — cannot create order later');
  }

  // تحقق: هل السلة تحتوي منتجات من متجر آخر؟
  if (state.cart.length && product.storeId) {
    const currentStore = state.cart[0].storeId;
    if (currentStore && currentStore !== product.storeId) {
      const ok = confirm(
        'سلتك تحتوي منتجات من متجر آخر. هل تريد إفراغ السلة والبدء من جديد؟',
      );
      if (!ok) return;
      state.cart = [];
    }
  }

  const existing = state.cart.find((i) => i.id === product.id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });

  saveCart();
  toast('تمت إضافة المنتج إلى السلة');
  updateCartBadge();
  renderCart();
}

function changeQuantity(productId, change) {
  const item = state.cart.find((i) => i.id === productId);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) state.cart = state.cart.filter((i) => i.id !== productId);
  saveCart();
  renderCart();
  updateCartBadge();
}

function renderCart() {
  const list    = document.querySelector('#cartList');
  const empty   = document.querySelector('#cartEmpty');
  const summary = document.querySelector('#cartSummary');
  if (!list) return;

  if (!state.cart.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    summary.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  summary.classList.remove('hidden');

  list.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div class="cart-icon">${item.icon || '🍔'}</div>
      <div class="cart-info">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${formatPrice(item.price)}</small>
        <div class="quantity">
          <button type="button" onclick="changeQuantity('${item.id}', -1)">−</button>
          <span>${item.quantity}</span>
          <button type="button" onclick="changeQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
      <strong>${formatPrice(item.price * item.quantity)}</strong>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((t, i) => t + Number(i.price) * i.quantity, 0);
  const delivery = subtotal > 0 ? 500 : 0;
  const total    = subtotal + delivery;

  document.querySelector('#subtotal').textContent    = formatPrice(subtotal);
  document.querySelector('#deliveryFee').textContent = formatPrice(delivery);
  document.querySelector('#total').textContent       = formatPrice(total);
}

function updateCartBadge() {
  const count = state.cart.reduce((t, i) => t + i.quantity, 0);
  const btn = [...document.querySelectorAll('.nav-item')]
    .find((i) => i.dataset.view === 'cartView');
  if (!btn) return;
  const label = btn.querySelector('small');
  if (label) label.textContent = count ? `السلة (${count})` : 'السلة';
}

window.changeQuantity = changeQuantity;
window.renderCart     = renderCart;
window.updateCartBadge = updateCartBadge;
