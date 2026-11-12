/* ============================================================
   ABSHER BI — categories.js (with debug)
   ============================================================ */

let categoriesCache = null;

async function loadCategories() {
  console.log('[DEBUG] loadCategories() called');

  const el = document.querySelector('#categoriesList');
  console.log('[DEBUG] #categoriesList element:', el);

  if (!el) {
    console.warn('[DEBUG] #categoriesList NOT FOUND!');
    return [];
  }

  el.innerHTML = '<div class="empty"><strong>جاري التحميل...</strong></div>';

  try {
    console.log('[DEBUG] Fetching /categories...');
    const list = await api('/categories');
    console.log('[DEBUG] Categories received:', list);

    categoriesCache = Array.isArray(list) ? list : [];
    renderCategories(categoriesCache);
    return categoriesCache;
  } catch (e) {
    console.error('[DEBUG] Load categories FAILED:', e);
    el.innerHTML = `
      <div class="empty">
        <strong>تعذر تحميل التصنيفات</strong>
        <p style="font-size:12px;margin-top:8px">${escapeHtml(humanError(e))}</p>
        <p style="font-size:10px;color:#666">HTTP ${e?.status || '?'}</p>
      </div>`;
    return [];
  }
}

function renderCategories(categories) {
  const el = document.querySelector('#categoriesList');
  if (!el) return;
  console.log('[DEBUG] renderCategories() with', categories.length, 'items');

  if (!categories.length) {
    el.innerHTML = '<div class="empty"><strong>لا توجد تصنيفات</strong></div>';
    return;
  }

  el.innerHTML = categories.map(c => `
    <button class="category-card" type="button"
      onclick="filterByCategory('${c.id}', '${escapeHtml(c.nameAr)}')">
      <div class="category-image">
        ${c.imageUrl
          ? `<img src="${escapeHtml(c.imageUrl)}" alt="${escapeHtml(c.nameAr)}" loading="lazy">`
          : '📁'}
      </div>
      <strong>${escapeHtml(c.nameAr)}</strong>
    </button>
  `).join('');
}

function filterByCategory(id, name) {
  window.__storesFilterCategory = id;
  toast(`عرض متاجر: ${name}`);
  loadStores();
}

window.loadCategories = loadCategories;
window.filterByCategory = filterByCategory;
