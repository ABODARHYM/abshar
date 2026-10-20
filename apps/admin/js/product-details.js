/* ============================================================
   ABSHER BI — product-details.js
   صفحة تفاصيل منتج
   ============================================================ */

async function openProduct(id) {
  showView('productDetailsView');
  const el = document.querySelector('#productDetailsContent');
  if (el) el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    const product = await api(`/products/${id}`);
    renderProductDetails(product);
  } catch (e) {
    console.error('Open product error:', e);
    if (el) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <strong>تعذر تحميل المنتج</strong>
          <p>${escapeHtml(humanError(e))}</p>
        </div>`;
    }
  }
}

function renderProductDetails(product) {
  const el = document.querySelector('#productDetailsContent');
  if (!el) return;

  el.innerHTML = `
    <div class="product-hero" style="${product.imageUrl
      ? `background-image:url('${escapeHtml(product.imageUrl)}')`
      : ''}">
      ${product.imageUrl ? '' : '🍽️'}
    </div>

    <div class="product-details-head">
      <h1>${escapeHtml(product.nameAr)}</h1>
      <p class="product-store" onclick="openStore('${product.storeId}')">
        🏪 ${escapeHtml(product.storeName)} →
      </p>
      ${product.descriptionAr
        ? `<p class="product-description">${escapeHtml(product.descriptionAr)}</p>`
        : ''}

      <div class="product-price-big">
        <span class="price">${formatPrice(product.basePrice)}</span>
        <span class="availability ${product.isAvailable ? 'open' : 'closed'}">
          ● ${product.isAvailable ? 'متوفر' : 'غير متوفر'}
        </span>
      </div>
    </div>

    <div class="product-actions">
      <button class="btn btn-primary full" type="button" ${!product.isAvailable ? 'disabled' : ''}
        onclick='addToCart(${JSON.stringify({
          id: product.id,
          name: product.nameAr,
          price: product.basePrice,
          icon: '🍽️',
          storeId: product.storeId,
        })})'>
        🛒 أضف إلى السلة
      </button>
      <button class="btn btn-secondary full" style="margin-top:10px" type="button"
        onclick="showView('storesView')">
        ← رجوع
      </button>
    </div>
  `;
}

window.openProduct = openProduct;
