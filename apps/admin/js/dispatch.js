/* ============================================================
   ABSHER BI — Smart Dispatch
   عروض التوصيل الذكية للمندوب
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = {
    pollInterval: 5000,
    offerSeconds: 30,
    maxOffers: 10,
    pageSize: 20
  };

  const dispatchState = {
    timer: null,
    polling: null,
    running: false,
    loading: false,
    accepting: false,
    offers: new Map(),
    knownOrders: new Set(),
    initialized: false,
    audioContext: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getStateUser() {
    return window.state && (window.state.user || window.state.profile);
  }

  function isDriver() {
    const user = getStateUser();

    if (user) {
      const roles = Array.isArray(user.roles) ? user.roles : [];

      if (
        roles.includes('driver') ||
        roles.includes('delivery_driver') ||
        roles.includes('courier')
      ) {
        return true;
      }
    }

    if (
      window.driverState &&
      window.driverState.profile
    ) {
      const profile = window.driverState.profile;

      if (
        profile.status === 'active' ||
        profile.availability === 'online' ||
        profile.availability === 'busy' ||
        profile.availability === 'offline'
      ) {
        return true;
      }
    }

    return false;
  }

  function getNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;

      const n = Number(value);

      if (Number.isFinite(n)) {
        return n;
      }
    }

    return 0;
  }

  function getString(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        return String(value);
      }
    }

    return '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeOrder(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const id = getString(
      raw.id,
      raw.orderId,
      raw.order_id
    );

    if (!id) return null;

    const orderNumber = getString(
      raw.orderNumber,
      raw.order_number,
      raw.number,
      raw.code,
      id.substring(0, 8)
    );

    const storeName = getString(
      raw.storeName,
      raw.store_name,
      raw.store?.nameAr,
      raw.store?.name_ar,
      raw.store?.name,
      raw.restaurantName,
      raw.restaurant_name,
      'المتجر'
    );

    const deliveryArea = getString(
      raw.deliveryArea,
      raw.delivery_area,
      raw.address?.area,
      raw.address?.district,
      raw.deliveryAddress?.area,
      raw.deliveryAddress?.district,
      raw.addressLine,
      raw.address_line,
      raw.delivery_address,
      raw.customerAddress,
      'موقع العميل'
    );

    const distanceKm = getNumber(
      raw.distanceKm,
      raw.distance_km,
      raw.distance,
      raw.driverDistanceKm,
      raw.driver_distance_km
    );

    const deliveryFee = getNumber(
      raw.deliveryFee,
      raw.delivery_fee,
      raw.driverFee,
      raw.driver_fee,
      raw.delivery?.fee,
      raw.delivery?.deliveryFee
    );

    const total = getNumber(
      raw.total,
      raw.totalAmount,
      raw.total_amount
    );

    const status = getString(
      raw.status,
      raw.orderStatus,
      raw.order_status,
      'ready'
    );

    const expiresAt = getString(
      raw.expiresAt,
      raw.expires_at,
      raw.offerExpiresAt,
      raw.offer_expires_at,
      raw.assignment?.expiresAt,
      raw.assignment?.expires_at
    );

    const roundNumber = getNumber(
      raw.roundNumber,
      raw.round_number,
      raw.assignment?.roundNumber,
      raw.assignment?.round_number
    );

    const tier = getNumber(
      raw.tier,
      raw.assignment?.tier
    );

    return {
      raw,
      id,
      orderNumber,
      storeName,
      deliveryArea,
      distanceKm,
      deliveryFee,
      total,
      status,
      expiresAt,
      roundNumber,
      tier
    };
  }

  function extractOrders(data) {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data.items)) {
      return data.items;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }

    if (Array.isArray(data.results)) {
      return data.results;
    }

    if (data.data && Array.isArray(data.data.items)) {
      return data.data.items;
    }

    return [];
  }

  function getRemainingSeconds(offer) {
    if (!offer) return 0;

    if (offer.expiresAt) {
      const timestamp = new Date(offer.expiresAt).getTime();

      if (Number.isFinite(timestamp)) {
        return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
      }
    }

    if (offer.localExpiresAt) {
      return Math.max(
        0,
        Math.ceil((offer.localExpiresAt - Date.now()) / 1000)
      );
    }

    return 0;
  }

  function createLocalOffer(order) {
    const existing = dispatchState.offers.get(order.id);

    if (existing) {
      return existing;
    }

    const offer = {
      ...order,
      firstSeenAt: Date.now(),
      localExpiresAt: Date.now() + CONFIG.offerSeconds * 1000,
      state: 'active'
    };

    dispatchState.offers.set(order.id, offer);

    return offer;
  }

  function removeOffer(orderId) {
    dispatchState.offers.delete(orderId);
  }

  function markKnown(orderId) {
    dispatchState.knownOrders.add(orderId);
  }

  function playBeep() {
    try {
      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioCtx) return;

      if (!dispatchState.audioContext) {
        dispatchState.audioContext = new AudioCtx();
      }

      const ctx = dispatchState.audioContext;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(1046, now + 0.12);
      oscillator.frequency.setValueAtTime(1318, now + 0.24);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.6);

      setTimeout(() => {
        try {
          const oscillator2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          oscillator2.type = 'sine';
          oscillator2.frequency.value = 988;

          gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(
            0.12,
            ctx.currentTime + 0.02
          );
          gain2.gain.exponentialRampToValueAtTime(
            0.0001,
            ctx.currentTime + 0.35
          );

          oscillator2.connect(gain2);
          gain2.connect(ctx.destination);

          oscillator2.start();
          oscillator2.stop(ctx.currentTime + 0.4);
        } catch (_) {}
      }, 650);
    } catch (_) {}
  }

  function vibrate() {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([180, 100, 180, 100, 350]);
      }
    } catch (_) {}
  }

  function notifyNewOffer(offer) {
    playBeep();
    vibrate();

    if (typeof window.toast === 'function') {
      window.toast(
        `🔔 طلب توصيل جديد #${offer.orderNumber}`,
        'success'
      );
    }

    if (
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('🔔 عرض توصيل جديد', {
          body:
            `${offer.storeName} → ${offer.deliveryArea}\n` +
            `لديك 30 ثانية للرد`,
          tag: `dispatch-${offer.id}`,
          requireInteraction: true
        });
      } catch (_) {}
    }
  }

  async function requestNotificationPermission() {
    try {
      if (
        'Notification' in window &&
        Notification.permission === 'default'
      ) {
        await Notification.requestPermission();
      }
    } catch (_) {}
  }

  function formatDistance(distance) {
    if (!distance || distance <= 0) {
      return 'غير محدد';
    }

    return `${distance.toFixed(2)} كم`;
  }

  function formatMoney(value) {
    if (!value || value <= 0) {
      return 'غير محدد';
    }

    return `${Number(value).toLocaleString('ar-YE')} ريال`;
  }

  function renderEmpty() {
    const container = $('dispatchOffers');

    if (!container) return;

    container.innerHTML = `
      <div class="dispatch-empty">
        <div class="dispatch-empty-icon">🛵</div>
        <strong>لا توجد عروض توصيل الآن</strong>
        <p>سنبحث لك عن طلبات جديدة تلقائيًا.</p>
        <div class="dispatch-pulse">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
  }

  function renderOffers() {
    const container = $('dispatchOffers');

    if (!container) return;

    const active = [];

    for (const offer of dispatchState.offers.values()) {
      if (getRemainingSeconds(offer) > 0 && offer.state === 'active') {
        active.push(offer);
      }
    }

    if (!active.length) {
      renderEmpty();
      return;
    }

    active.sort((a, b) => {
      return getRemainingSeconds(a) - getRemainingSeconds(b);
    });

    container.innerHTML = active
      .slice(0, CONFIG.maxOffers)
      .map(renderOfferCard)
      .join('');
  }

  function renderOfferCard(offer) {
    const remaining = getRemainingSeconds(offer);
    const percent = Math.max(
      0,
      Math.min(
        100,
        Math.round((remaining / CONFIG.offerSeconds) * 100)
      )
    );

    const urgent = remaining <= 10;

    const roundText =
      offer.roundNumber > 0
        ? `الجولة ${offer.roundNumber}`
        : 'توزيع ذكي';

    return `
      <article
        class="dispatch-offer ${urgent ? 'urgent' : ''}"
        data-dispatch-id="${escapeHtml(offer.id)}"
      >
        <div class="dispatch-offer-head">
          <div>
            <span class="dispatch-exclusive">🔔 عرض حصري لك</span>
            <strong>#${escapeHtml(offer.orderNumber)}</strong>
          </div>

          <span class="dispatch-round">
            ${escapeHtml(roundText)}
          </span>
        </div>

        <div class="dispatch-route">
          <div class="dispatch-route-point">
            <span class="dispatch-route-icon store">🏪</span>
            <div>
              <small>الاستلام من</small>
              <strong>${escapeHtml(offer.storeName)}</strong>
            </div>
          </div>

          <div class="dispatch-route-line"></div>

          <div class="dispatch-route-point">
            <span class="dispatch-route-icon customer">📍</span>
            <div>
              <small>التوصيل إلى</small>
              <strong>${escapeHtml(offer.deliveryArea)}</strong>
            </div>
          </div>
        </div>

        <div class="dispatch-stats">
          <div>
            <span>📏 المسافة</span>
            <strong>${escapeHtml(formatDistance(offer.distanceKm))}</strong>
          </div>

          <div>
            <span>💰 الأجرة</span>
            <strong>${escapeHtml(formatMoney(offer.deliveryFee))}</strong>
          </div>

          <div>
            <span>⏱️ المتبقي</span>
            <strong class="dispatch-countdown">
              ${String(remaining).padStart(2, '0')}ث
            </strong>
          </div>
        </div>

        <div class="dispatch-progress">
          <span style="width:${percent}%"></span>
        </div>

        <div class="dispatch-actions">
          <button
            type="button"
            class="dispatch-reject"
            data-dispatch-action="reject"
            data-order-id="${escapeHtml(offer.id)}"
          >
            ❌ رفض
          </button>

          <button
            type="button"
            class="dispatch-accept"
            data-dispatch-action="accept"
            data-order-id="${escapeHtml(offer.id)}"
          >
            ✅ قبول الطلب
          </button>
        </div>
      </article>
    `;
  }

  async function loadAvailableOffers() {
    if (!isDriver()) return;
    if (dispatchState.loading) return;

    dispatchState.loading = true;

    try {
      const result = await api(
        `/driver/orders/available?page=1&limit=${CONFIG.pageSize}`
      );

      const rawOrders = extractOrders(result);
      const currentIds = new Set();

      for (const raw of rawOrders) {
        const order = normalizeOrder(raw);

        if (!order) continue;

        currentIds.add(order.id);

        const wasKnown = dispatchState.knownOrders.has(order.id);
        const existing = dispatchState.offers.get(order.id);

        if (!existing) {
          const offer = createLocalOffer(order);

          if (!wasKnown) {
            notifyNewOffer(offer);
          }
        } else {
          dispatchState.offers.set(order.id, {
            ...existing,
            ...order
          });
        }

        markKnown(order.id);
      }

      for (const [id, offer] of dispatchState.offers.entries()) {
        if (
          !currentIds.has(id) &&
          getRemainingSeconds(offer) <= 0
        ) {
          dispatchState.offers.delete(id);
        }
      }

      renderOffers();
    } catch (error) {
      console.warn(
        '[SmartDispatch] load offers failed:',
        error
      );
    } finally {
      dispatchState.loading = false;
    }
  }

  async function acceptOffer(orderId) {
    if (dispatchState.accepting) return;

    const offer = dispatchState.offers.get(orderId);

    if (!offer) {
      showDispatchMessage('العرض غير موجود أو انتهت صلاحيته', 'error');
      return;
    }

    if (getRemainingSeconds(offer) <= 0) {
      removeOffer(orderId);
      renderOffers();
      showDispatchMessage('انتهت مهلة العرض', 'error');
      return;
    }

    dispatchState.accepting = true;

    const card = document.querySelector(
      `[data-dispatch-id="${CSS.escape(orderId)}"]`
    );

    const button = card?.querySelector(
      '[data-dispatch-action="accept"]'
    );

    if (button) {
      button.disabled = true;
      button.innerHTML = '⏳ جاري القبول...';
    }

    try {
      const result = await api(
        `/driver/orders/${encodeURIComponent(orderId)}/accept`,
        {
          method: 'POST'
        }
      );

      removeOffer(orderId);

      for (const [id] of dispatchState.offers.entries()) {
        if (id !== orderId) {
          dispatchState.offers.delete(id);
        }
      }

      renderOffers();

      showDispatchMessage(
        '✅ تم قبول الطلب بنجاح',
        'success'
      );

      if (
        typeof window.openDriverOrderDetails === 'function'
      ) {
        setTimeout(() => {
          window.openDriverOrderDetails(orderId);
        }, 350);
      } else if (
        typeof window.showView === 'function'
      ) {
        setTimeout(() => {
          window.showView('driverOrderDetailsView');
        }, 350);
      }

      return result;
    } catch (error) {
      console.error(
        '[SmartDispatch] accept failed:',
        error
      );

      const status = error?.status;

      let msg = 'تعذر قبول الطلب';

      if (status === 409) {
        msg = '⚠️ سبق أن استلم مندوب آخر هذا الطلب';
      } else if (status === 410) {
        msg = '⏱️ انتهت مهلة العرض';
      } else if (status === 403) {
        msg = 'ليس لديك صلاحية لقبول هذا الطلب';
      } else if (status === 404) {
        msg = 'الطلب لم يعد متاحًا';
      } else if (typeof humanError === 'function') {
        msg = humanError(error);
      }

      showDispatchMessage(msg, 'error');

      removeOffer(orderId);
      renderOffers();

      await loadAvailableOffers();
    } finally {
      dispatchState.accepting = false;
    }
  }

  async function rejectOffer(orderId) {
    if (dispatchState.accepting) return;

    const offer = dispatchState.offers.get(orderId);

    if (!offer) {
      showDispatchMessage(
        'العرض غير موجود أو انتهت صلاحيته',
        'error'
      );
      return;
    }

    const card = document.querySelector(
      `[data-dispatch-id="${CSS.escape(orderId)}"]`
    );

    const button = card?.querySelector(
      '[data-dispatch-action="reject"]'
    );

    if (button) {
      button.disabled = true;
      button.innerHTML = '⏳ جاري الرفض...';
    }

    try {
      await api(
        `/driver/orders/${encodeURIComponent(orderId)}/reject`,
        {
          method: 'POST'
        }
      );

      removeOffer(orderId);
      renderOffers();

      showDispatchMessage(
        'تم رفض العرض بنجاح',
        'success'
      );

      setTimeout(() => {
        loadAvailableOffers();
      }, 250);

    } catch (error) {
      const message = String(
        error?.message ||
        error ||
        ''
      );

      if (
        message.includes('سبق أن استلم مندوب آخر') ||
        message.includes('already') ||
        message.includes('taken') ||
        message.includes('غير متاح')
      ) {
        removeOffer(orderId);
        renderOffers();

        showDispatchMessage(
          'تم استلام الطلب من مندوب آخر',
          'error'
        );

        setTimeout(() => {
          loadAvailableOffers();
        }, 250);

        return;
      }

      if (button) {
        button.disabled = false;
        button.innerHTML = 'رفض';
      }

      showDispatchMessage(
        'تعذر رفض العرض: ' + message,
        'error'
      );
    }
  }

  function showDispatchMessage(message, type) {
    if (typeof window.toast === 'function') {
      window.toast(message, type || 'success');
      return;
    }

    const box = $('dispatchMessage');

    if (!box) return;

    box.textContent = message;
    box.className =
      `dispatch-message ${type || 'success'}`;

    clearTimeout(box._timer);

    box._timer = setTimeout(() => {
      box.className = 'dispatch-message hidden';
    }, 3500);
  }

  function handleActionClick(event) {
    const target = event.target.closest(
      '[data-dispatch-action]'
    );

    if (!target) return;

    const action = target.dataset.dispatchAction;
    const orderId = target.dataset.orderId;

    if (!orderId) return;

    if (action === 'accept') {
      acceptOffer(orderId);
    }

    if (action === 'reject') {
      rejectOffer(orderId);
    }
  }

  function tick() {
    let changed = false;

    for (const [id, offer] of dispatchState.offers.entries()) {
      const remaining = getRemainingSeconds(offer);

      if (remaining <= 0) {
        dispatchState.offers.delete(id);
        changed = true;
      }
    }

    renderOffers();

    if (changed) {
      loadAvailableOffers();
    }
  }

  function ensureDispatchView() {
    let view = $('driverDispatchView');

    if (view) return view;

    const parent = $('driverDashboardContent');

    if (!parent) return null;

    view = document.createElement('section');

    view.id = 'driverDispatchView';
    view.className = 'driver-dispatch-section';

    view.innerHTML = `
      <div class="dispatch-header">
        <div>
          <span class="dispatch-kicker">SMART DISPATCH</span>
          <h2>عروض التوصيل</h2>
          <p>طلبات قريبة منك يتم توزيعها عليك تلقائيًا.</p>
        </div>

        <div class="dispatch-live">
          <span></span>
          مباشر
        </div>
      </div>

      <div id="dispatchMessage" class="dispatch-message hidden"></div>

      <div id="dispatchOffers"></div>
    `;

    parent.prepend(view);

    view.addEventListener('click', handleActionClick);

    return view;
  }

  async function start() {
    if (!isDriver()) return;

    if (!ensureDispatchView()) {
      return;
    }

    if (dispatchState.running) {
      await loadAvailableOffers();
      return;
    }

    dispatchState.running = true;

    await requestNotificationPermission();
    await loadAvailableOffers();

    dispatchState.polling = setInterval(
      loadAvailableOffers,
      CONFIG.pollInterval
    );

    dispatchState.timer = setInterval(
      tick,
      1000
    );

    console.log('[SmartDispatch] Driver dispatch started');
  }

  function stop() {
    if (dispatchState.polling) {
      clearInterval(dispatchState.polling);
      dispatchState.polling = null;
    }

    if (dispatchState.timer) {
      clearInterval(dispatchState.timer);
      dispatchState.timer = null;
    }

    dispatchState.running = false;
  }

  function open() {
    if (
      typeof window.showView === 'function'
    ) {
      window.showView('driverDashboardView');
    }

    setTimeout(start, 100);
  }

  window.startSmartDispatch = start;
  window.stopSmartDispatch = stop;
  window.openSmartDispatch = open;
  window.acceptDispatchOffer = acceptOffer;
  window.rejectDispatchOffer = rejectOffer;

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      if (isDriver()) {
        setTimeout(start, 500);
      }
    }
  );

  document.addEventListener(
    'click',
    function () {
      /*
       * يفتح AudioContext بعد أول تفاعل للمستخدم،
       * حتى يكون الصوت جاهزًا قدر الإمكان.
       */
      try {
        const AudioCtx =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioCtx) return;

        if (!dispatchState.audioContext) {
          dispatchState.audioContext = new AudioCtx();
        }

        if (
          dispatchState.audioContext.state === 'suspended'
        ) {
          dispatchState.audioContext.resume().catch(() => {});
        }
      } catch (_) {}
    },
    { passive: true }
  );

  window.addEventListener(
    'online',
    function () {
      if (isDriver()) {
        loadAvailableOffers();
      }
    }
  );

  window.addEventListener(
    'beforeunload',
    function () {
      stop();
    }
  );

  console.log('[SmartDispatch] module loaded');
})();
