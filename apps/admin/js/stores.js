/* ============================================================
   ABSHER BI — stores.js
   قائمة المتاجر + تفاصيل متجر
   ============================================================ */

async function loadStores() {
  const el = document.querySelector('#storesList');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  const params = new URLSearchParams({ limit: '20' });
  if (window.__storesFilterCategory) params.set('categoryId', window.__storesFilterCategory);
  const search = document.querySelector('#searchInput')?.value?.trim();
  if (search) params.set('search', search);

  try {
    const res = await api(`/stores?${params}`);
    renderStores(res.items || []);
  } catch (e) {
    console.error('Load stores error:', e);
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <strong>تعذر تحميل المتاجر</strong>
        <p>${escapeHtml(humanError(e))}</p>
      </div>`;
  }
}

function renderStores(stores) {
  const el = document.querySelector('#storesList');
  if (!el) return;
  if (!stores.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🏪</div>
        <strong>لا توجد متاجر</strong>
        <p>جرب البحث بكلمات أخرى</p>
      </div>`;
    return;
  }
  el.innerHTML = stores.map(s => `
    <div class="store-card" onclick="openStore('${s.id}')">
      <div class="store-image" style="${s.coverUrl
        ? `background-image:url('${escapeHtml(s.coverUrl)}');background-size:cover;background-position:center`
        : ''}">
        ${s.coverUrl ? '' : '🏪'}
      </div>
      <div class="store-info">
        <strong>${escapeHtml(s.nameAr)}</strong>
        <small>${escapeHtml(s.descriptionAr || s.addressText || '')}</small>
        <div class="store-meta">
          <span class="${s.isOpen ? 'open' : 'closed'}">● ${s.isOpen ? 'مفتوح' : 'مغلق'}</span>
          <span>⭐ ${s.ratingAvg} (${s.ratingCount})</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function openStore(id) {
  showView('storeDetailsView');
  const el = document.querySelector('#storeDetailsContent');
  if (el) el.innerHTML = '<div class="empty"><div class="spinner" style="margin:auto"></div></div>';

  try {
    const [store, productsRes] = await Promise.all([
      api(`/stores/${id}`),
      api(`/products?storeId=${id}&limit=50`),
    ]);
    renderStoreDetails(store, productsRes.items || []);
  } catch (e) {
    console.error('Open store error:', e);
    if (el) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <strong>تعذر تحميل المتجر</strong>
          <p>${escapeHtml(humanError(e))}</p>
        </div>`;
    }
  }
}

function renderStoreDetails(store, products) {
  const el = document.querySelector('#storeDetailsContent');
  if (!el) return;

  // جهّز بيانات المنتجات ككائنات ثم سلسلها كـ JSON
  const productsHtml = products.map((p) => {
    const productPayload = {
      id: p.id,
      name: p.nameAr,
      price: p.basePrice,
      icon: '🍽️',
      storeId: store.id,
    };
    const payloadJson = JSON.stringify(productPayload).replace(/'/g, '&#39;');

    return `
      <div class="product-card" onclick="openProduct('${p.id}')">
        <div class="product-image" style="${p.imageUrl
          ? `background-image:url('${escapeHtml(p.imageUrl)}');background-size:cover;background-position:center`
          : ''}">
          ${p.imageUrl ? '' : '🍽️'}
        </div>
        <div class="product-info">
          <strong>${escapeHtml(p.nameAr)}</strong>
          <small>${escapeHtml(p.descriptionAr || '')}</small>
          <div class="product-price">
            <span class="price">${formatPrice(p.basePrice)}</span>
            <button class="add-btn" type="button"
              onclick='event.stopPropagation(); addToCart(${payloadJson})'>+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="store-cover" style="${store.coverUrl
      ? `background-image:url('${escapeHtml(store.coverUrl)}')`
      : ''}">
      ${store.coverUrl ? '' : '🏪'}
    </div>

    <div class="store-details-head">
      <h1>${escapeHtml(store.nameAr)}</h1>
      <div class="store-meta">
        <span class="${store.isOpen ? 'open' : 'closed'}">● ${store.isOpen ? 'مفتوح' : 'مغلق'}</span>
        <span>⭐ ${store.ratingAvg} (${store.ratingCount})</span>
        <span>🛵 ${formatPrice(store.deliveryFee)}</span>
        <span>⏱️ ${store.avgPrepMinutes} دقيقة</span>
      </div>
      ${store.descriptionAr
        ? `<p style="color:var(--muted);margin-top:12px">${escapeHtml(store.descriptionAr)}</p>`
        : ''}
      <p style="color:var(--muted);margin-top:6px">📍 ${escapeHtml(store.addressText)}</p>
    </div>

    <section class="section">
      <div class="section-title"><h2>المنتجات</h2></div>
      <div class="grid">
        ${products.length ? productsHtml : '<div class="empty"><strong>لا توجد منتجات</strong></div>'}
      </div>
    </section>

    <button class="btn btn-secondary full" style="margin-top:20px"
      onclick="showView('storesView')">← رجوع للمتاجر</button>
  `;
}

window.loadStores = loadStores;
window.openStore = openStore;
