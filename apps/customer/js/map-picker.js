/* ============================================================
   ABSHER BI - map-picker.js
   خريطة تفاعلية لاختيار موقع العنوان (Leaflet + OpenStreetMap)
   ============================================================ */

var mapPickerState = {
  map: null,
  marker: null,
  modal: null,
  onConfirm: null,
  initialLat: 15.369445,
  initialLng: 44.191006,
};

// ═══════════════════════════════════════════════════════════════
//  1) تحميل Leaflet ديناميكيًا
// ═══════════════════════════════════════════════════════════════

function loadLeaflet(callback) {
  if (window.L) {
    callback();
    return;
  }

  // CSS
  if (!document.querySelector('#leaflet-css')) {
    var link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // JS
  if (!document.querySelector('#leaflet-js')) {
    var script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = function () {
      callback();
    };
    script.onerror = function () {
      console.error('[map-picker] Failed to load Leaflet');
      alert('تعذر تحميل الخريطة. تحقق من الاتصال بالإنترنت.');
    };
    document.head.appendChild(script);
  } else {
    // ينتظر التحميل
    var check = setInterval(function () {
      if (window.L) {
        clearInterval(check);
        callback();
      }
    }, 100);
  }
}

// ═══════════════════════════════════════════════════════════════
//  2) فتح نافذة الخريطة
// ═══════════════════════════════════════════════════════════════

function openMapPicker(initialLat, initialLng, onConfirm) {
  mapPickerState.onConfirm = onConfirm;
  mapPickerState.initialLat = initialLat || 15.369445;
  mapPickerState.initialLng = initialLng || 44.191006;

  // أنشئ modal إن لم يكن موجودًا
  if (!document.querySelector('#mapPickerModal')) {
    var modal = document.createElement('div');
    modal.id = 'mapPickerModal';
    modal.className = 'modal hidden';
    modal.innerHTML = [
      '<div class="modal-card" style="padding:0;max-height:95vh;display:flex;flex-direction:column">',
        '<div class="modal-head" style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">',
          '<h2>\uD83D\uDDFA\uFE0F اختر الموقع</h2>',
          '<button class="icon-btn" type="button" onclick="closeMapPicker()">\u00D7</button>',
        '</div>',
        '<div id="mapPickerContainer" style="flex:1;min-height:60vh;position:relative"></div>',
        '<div style="padding:16px 20px;border-top:1px solid var(--border);flex-shrink:0">',
          '<div id="mapPickerCoords" style="margin-bottom:12px;font-size:12px;color:var(--muted);text-align:center"></div>',
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">',
            '<button class="btn btn-secondary" type="button" onclick="locateMe()">\uD83D\uDCCD موقعي</button>',
            '<button class="btn btn-primary" type="button" onclick="confirmMapPicker()">\u2705 تأكيد</button>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(modal);
  }

  document.querySelector('#mapPickerModal').classList.remove('hidden');

  // انتظر ظهور الـ modal ثم حمّل الخريطة
  setTimeout(function () {
    loadLeaflet(function () {
      initMap();
    });
  }, 100);
}

function closeMapPicker() {
  var modal = document.querySelector('#mapPickerModal');
  if (modal) modal.classList.add('hidden');
  if (mapPickerState.map) {
    mapPickerState.map.remove();
    mapPickerState.map = null;
    mapPickerState.marker = null;
  }
}

function initMap() {
  var container = document.querySelector('#mapPickerContainer');
  if (!container) return;

  // احذف خريطة قديمة
  if (mapPickerState.map) {
    mapPickerState.map.remove();
  }
  container.innerHTML = '';

  // أنشئ خريطة جديدة
  mapPickerState.map = L.map('mapPickerContainer', {
    center: [mapPickerState.initialLat, mapPickerState.initialLng],
    zoom: 15,
    zoomControl: true,
  });

  // طبقة OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(mapPickerState.map);

  // Marker قابل للسحب
  mapPickerState.marker = L.marker(
    [mapPickerState.initialLat, mapPickerState.initialLng],
    { draggable: true }
  ).addTo(mapPickerState.map);

  // عند سحب marker
  mapPickerState.marker.on('dragend', function () {
    var pos = mapPickerState.marker.getLatLng();
    updateCoords(pos.lat, pos.lng);
  });

  // عند النقر على الخريطة
  mapPickerState.map.on('click', function (e) {
    mapPickerState.marker.setLatLng(e.latlng);
    updateCoords(e.latlng.lat, e.latlng.lng);
  });

  updateCoords(mapPickerState.initialLat, mapPickerState.initialLng);

  // ضروري: أعد حساب الأبعاد بعد ظهور الـ modal
  setTimeout(function () {
    if (mapPickerState.map) mapPickerState.map.invalidateSize();
  }, 200);
}

function updateCoords(lat, lng) {
  mapPickerState.initialLat = lat;
  mapPickerState.initialLng = lng;
  var el = document.querySelector('#mapPickerCoords');
  if (el) {
    el.textContent = '\uD83D\uDCCD ' + lat.toFixed(6) + ' \u00B7 ' + lng.toFixed(6);
  }
}

// ═══════════════════════════════════════════════════════════════
//  3) الإجراءات
// ═══════════════════════════════════════════════════════════════

function locateMe() {
  if (!navigator.geolocation) {
    toast('المتصفح لا يدعم تحديد الموقع', 'error');
    return;
  }

  showLoading('جاري تحديد موقعك...');
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      hideLoading();
      if (mapPickerState.map && mapPickerState.marker) {
        var latlng = [pos.coords.latitude, pos.coords.longitude];
        mapPickerState.map.setView(latlng, 16);
        mapPickerState.marker.setLatLng(latlng);
        updateCoords(pos.coords.latitude, pos.coords.longitude);
      }
    },
    function (err) {
      hideLoading();
      console.error('Geolocation error:', err);
      toast('تعذر الحصول على موقعك. تأكد من الأذونات.', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function confirmMapPicker() {
  var lat = mapPickerState.initialLat;
  var lng = mapPickerState.initialLng;

  if (typeof mapPickerState.onConfirm === 'function') {
    mapPickerState.onConfirm(lat, lng);
  }

  closeMapPicker();
}

// ═══════════════════════════════════════════════════════════════
//  4) Export
// ═══════════════════════════════════════════════════════════════

window.openMapPicker = openMapPicker;
window.closeMapPicker = closeMapPicker;
window.locateMe = locateMe;
window.confirmMapPicker = confirmMapPicker;
