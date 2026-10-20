/* ============================================================
   ABSHER BI — addresses.js
   قائمة العناوين + إضافة/تعديل/حذف + تعيين افتراضي
   ============================================================ */

async function loadAddresses() {
  try {
    const list = await api('/addresses');
    state.addresses = Array.isArray(list) ? list : [];
    renderAddresses();
  } catch (error) {
    console.error('Load addresses error:', error);
    toast(humanError(error), 'error');
  }
}

function renderAddresses() {
  const list = $('#addressesList');
  if (!list) return;

  if (!state.addresses.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📍</div>
        <strong>لا توجد عناوين</strong>
        <p>أضف عنوانك لتسهيل توصيل طلباتك.</p>
      </div>`;
    return;
  }

  list.innerHTML = state.addresses.map(a => `
    <div class="address-card">
      <strong>
        📍 ${escapeHtml(a.label || 'home')}
        ${a.isDefault ? '<span class="address-badge">افتراضي</span>' : ''}
      </strong>
      <p>${escapeHtml(a.addressLine)}</p>
      ${a.building || a.floor || a.apartment
        ? `<p>🏢 ${escapeHtml(a.building || '-')} / طابق ${escapeHtml(a.floor || '-')} / شقة ${escapeHtml(a.apartment || '-')}</p>`
        : ''}
      ${a.landmark ? `<p>🗺️ ${escapeHtml(a.landmark)}</p>` : ''}
      <p style="opacity:.6;font-size:11px">🌐 ${a.latitude}, ${a.longitude}</p>
      <div class="address-actions">
        ${!a.isDefault
          ? `<button class="btn btn-secondary btn-small" type="button" onclick="setDefaultAddress('${a.id}')">تعيين افتراضي</button>`
          : ''}
        <button class="btn btn-secondary btn-small" type="button" onclick="editAddress('${a.id}')">تعديل</button>
        <button class="btn btn-danger btn-small" type="button" onclick="removeAddress('${a.id}')">حذف</button>
      </div>
    </div>
  `).join('');
}

function openAddressModal(address = null) {
  $('#addressModalTitle').textContent = address ? 'تعديل عنوان' : 'إضافة عنوان';
  $('#addressId').value          = address?.id || '';
  $('#addressLabel').value       = address?.label || 'home';
  $('#addressLine').value        = address?.addressLine || '';
  $('#addressBuilding').value    = address?.building || '';
  $('#addressFloor').value       = address?.floor || '';
  $('#addressApartment').value   = address?.apartment || '';
  $('#addressLandmark').value    = address?.landmark || '';
  $('#addressLat').value         = address?.latitude ?? 15.369445;
  $('#addressLng').value         = address?.longitude ?? 44.191006;
  $('#addressIsDefault').checked = !!address?.isDefault;
  $('#addressModal').classList.remove('hidden');
}

function closeAddressModal() {
  $('#addressModal').classList.add('hidden');
  $('#addressForm').reset();
  $('#addressId').value = '';
}

async function submitAddress(event) {
  event.preventDefault();
  const id = $('#addressId').value;

  const payload = {
    label:       $('#addressLabel').value.trim() || 'home',
    addressLine: $('#addressLine').value.trim(),
    building:    $('#addressBuilding').value.trim() || undefined,
    floor:       $('#addressFloor').value.trim() || undefined,
    apartment:   $('#addressApartment').value.trim() || undefined,
    landmark:    $('#addressLandmark').value.trim() || undefined,
    latitude:    parseFloat($('#addressLat').value),
    longitude:   parseFloat($('#addressLng').value),
    isDefault:   $('#addressIsDefault').checked,
  };

  if (!payload.addressLine || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
    toast('أكمل الحقول الإلزامية', 'error');
    return;
  }

  showLoading(id ? 'جاري التحديث...' : 'جاري الحفظ...');
  try {
    if (id) {
      await api(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast('تم تحديث العنوان');
    } else {
      await api('/addresses', { method: 'POST', body: JSON.stringify(payload) });
      toast('تم حفظ العنوان');
    }
    closeAddressModal();
    await loadAddresses();
  } catch (error) {
    console.error('Save address error:', error);
    toast(humanError(error), 'error');
  } finally {
    hideLoading();
  }
}

function editAddress(id) {
  const address = state.addresses.find(a => a.id === id);
  if (address) openAddressModal(address);
}

async function removeAddress(id) {
  if (!confirm('هل تريد حذف هذا العنوان؟')) return;
  showLoading('جاري الحذف...');
  try {
    await api(`/addresses/${id}`, { method: 'DELETE' });
    toast('تم حذف العنوان');
    await loadAddresses();
  } catch (error) {
    console.error('Delete address error:', error);
    toast(humanError(error), 'error');
  } finally {
    hideLoading();
  }
}

async function setDefaultAddress(id) {
  showLoading('جاري التعيين...');
  try {
    await api(`/addresses/${id}/set-default`, { method: 'PATCH' });
    toast('تم تعيين العنوان الافتراضي');
    await loadAddresses();
  } catch (error) {
    console.error('Set default error:', error);
    toast(humanError(error), 'error');
  } finally {
    hideLoading();
  }
}

// expose للأزرار الديناميكية
window.loadAddresses   = loadAddresses;
window.editAddress     = editAddress;
window.removeAddress   = removeAddress;
window.setDefaultAddress = setDefaultAddress;


// ═══════════════════════════════════════════════════════════════
//  دعم الخريطة التفاعلية
// ═══════════════════════════════════════════════════════════════

function openAddressMapPicker() {
  var lat = parseFloat(document.querySelector('#addressLat').value) || 15.369445;
  var lng = parseFloat(document.querySelector('#addressLng').value) || 44.191006;

  if (typeof openMapPicker !== 'function') {
    toast('الخريطة غير متوفرة', 'error');
    return;
  }

  openMapPicker(lat, lng, function (newLat, newLng) {
    document.querySelector('#addressLat').value = newLat.toFixed(6);
    document.querySelector('#addressLng').value = newLng.toFixed(6);

    var display = document.querySelector('#addressCoordsDisplay');
    if (display) {
      display.textContent = '\uD83D\uDCCD ' + newLat.toFixed(6) + ' \u00B7 ' + newLng.toFixed(6);
    }

    toast('تم تحديث الموقع');
  });
}

window.openAddressMapPicker = openAddressMapPicker;
