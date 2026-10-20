'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import TopBar from '@/components/TopBar';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] h-[300px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-red)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text-muted)]">جاري تحميل الخريطة...</p>
      </div>
    </div>
  ),
});

const API = '/api/v1';

interface City { id: string; nameAr: string; }
interface District { id: string; nameAr: string; }
interface Area { id: string; nameAr: string; }

function NewAddressContent() {
  const router = useRouter();

  const [label, setLabel] = useState('المنزل');
  const [addressLine, setAddressLine] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [cityId, setCityId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const [lat, setLat] = useState(15.4633);
  const [lng, setLng] = useState(45.3256);

  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // تسجيل تشخيصي
  const log = (msg: string) => {
    console.log('[Address]', msg);
    setDebugLog((prev) => [...prev, msg]);
  };

  useEffect(() => {
    fetch(`${API}/geography/cities`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        log(`Cities: ${list.length}`);
        setCities(list);
        if (list.length === 1) setCityId(list[0].id);
      })
      .catch((e) => log(`Cities failed: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setDistricts([]); setDistrictId(''); setAreas([]); setAreaId('');
    if (!cityId) return;
    fetch(`${API}/geography/cities/${cityId}/districts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        log(`Districts: ${list.length}`);
        setDistricts(list);
      })
      .catch(() => {});
  }, [cityId]);

  useEffect(() => {
    setAreas([]); setAreaId('');
    if (!districtId) return;
    fetch(`${API}/geography/districts/${districtId}/areas`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        log(`Areas: ${list.length}`);
        setAreas(list);
      })
      .catch(() => {});
  }, [districtId]);

  const submit = async () => {
    setError('');
    log('=== Submit pressed ===');

    // Validations
    if (!label.trim()) {
      setError('اسم العنوان مطلوب');
      log('❌ label empty');
      return;
    }
    if (!addressLine.trim()) {
      setError('وصف العنوان مطلوب');
      log('❌ addressLine empty');
      return;
    }

    // Token check
    const token = localStorage.getItem('accessToken');
    log(`Token: ${token ? 'PRESENT (hidden)' : 'MISSING'}`);

    if (!token) {
      setError('يجب تسجيل الدخول أولاً');
      log('❌ No token — redirecting to login');
      setTimeout(() => router.push('/login?redirect=/addresses/new'), 1500);
      return;
    }

    // التحقق من صلاحية تسجيل الدخول قبل إنشاء العنوان
    try {
      const authRes = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      log(`Auth check: ${authRes.status}`);

      if (!authRes.ok) {
        const authBody = await authRes.text();
        log(`Auth response: ${authBody.slice(0, 160)}`);
        setError('تعذر التحقق من تسجيل الدخول. سجّل الخروج ثم الدخول مجددًا.');
        return;
      }

      log('Auth check: token accepted');
    } catch (e) {
      log(`Auth check failed: ${e instanceof Error ? e.message : 'network error'}`);
      setError('تعذر الاتصال بخدمة التحقق من تسجيل الدخول.');
      return;
    }

    setSubmitting(true);

    const rawPayload: any = {
      label: label.trim(),
      addressLine: addressLine.trim(),
      latitude: Number(Number(lat).toFixed(6)),
      longitude: Number(Number(lng).toFixed(6)),
      isDefault,
    };

    // أضف الحقول الاختيارية فقط إذا كانت موجودة فعلياً
    if (building.trim()) rawPayload.building = building.trim();
    if (floor.trim()) rawPayload.floor = floor.trim();
    if (apartment.trim()) rawPayload.apartment = apartment.trim();
    if (landmark.trim()) rawPayload.landmark = landmark.trim();
    if (cityId && cityId.length > 10) rawPayload.cityId = cityId;
    if (districtId && districtId.length > 10) rawPayload.districtId = districtId;
    if (areaId && areaId.length > 10) rawPayload.areaId = areaId;

    const payload = rawPayload;
    console.log('[Address Debug]', {
      lat,
      latType: typeof lat,
      lng,
      lngType: typeof lng,
      payloadLatitude: rawPayload.latitude,
      payloadLongitude: rawPayload.longitude,
    });

    log(`Payload: ${JSON.stringify(payload).slice(0, 200)}`);

    try {
      const url = `${API}/addresses`;
      log(`POST ${url}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      log(`Response: ${res.status}`);

      let data: any = {};
      try {
        data = await res.json();
        log(`Body: ${JSON.stringify(data).slice(0, 200)}`);
      } catch {}

      if (!res.ok) {
        setError(data.message || `فشل (${res.status})`);
        setSubmitting(false);
        return;
      }

      log('✅ Success!');
      router.push('/addresses');
    } catch (e) {
      const msg = (e as Error).message;
      log(`❌ Exception: ${msg}`);
      setError('خطأ في الاتصال: ' + msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="عنوان جديد" showBack />
        <main className="container-app py-4">
          <div className="skeleton h-40 rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <TopBar title="عنوان جديد" showBack />

      <main className="container-app py-4 space-y-4">
        {error && (
          <div className="card border-r-4 border-r-[var(--danger)]">
            <p className="text-sm font-bold text-[var(--danger)]">⚠️ {error}</p>
          </div>
        )}

        {/* Debug Log (temporary) */}
        {debugLog.length > 0 && (
          <details className="card bg-[var(--bg-elevated)] text-xs">
            <summary className="font-bold cursor-pointer">🔍 تشخيص ({debugLog.length})</summary>
            <pre className="mt-2 text-[10px] text-[var(--text-muted)] whitespace-pre-wrap max-h-40 overflow-auto" dir="ltr">
              {debugLog.join('\n')}
            </pre>
          </details>
        )}

        <div className="card">
          <label className="block text-sm font-bold mb-2">
            اسم العنوان <span className="text-[var(--brand-red)]">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="المنزل، العمل"
            className="input"
          />
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-3">📍 اضغط على الخريطة أو اسحب العلامة</label>
          <MapPicker
            initialLat={lat}
            initialLng={lng}
            onLocationChange={(newLat, newLng, addr) => {
              setLat(newLat);
              setLng(newLng);
              if (addr && !addressLine) {
                setAddressLine(addr.slice(0, 200));
              }
            }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs" dir="ltr">
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg">
              <span className="text-[var(--text-muted)]">Lat:</span>{' '}
              <span className="font-mono font-bold">{lat.toFixed(6)}</span>
            </div>
            <div className="bg-[var(--bg-elevated)] p-2 rounded-lg">
              <span className="text-[var(--text-muted)]">Lng:</span>{' '}
              <span className="font-mono font-bold">{lng.toFixed(6)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-2">
            وصف العنوان <span className="text-[var(--brand-red)]">*</span>
          </label>
          <textarea
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="شارع الخياطين، سوق هنت، مأرب"
            className="input"
            rows={2}
          />
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-2">المدينة</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="input">
            <option value="">— اختر —</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
        </div>

        {cityId && districts.length > 0 && (
          <div className="card">
            <label className="block text-sm font-bold mb-2">الحي</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="input">
              <option value="">— اختر —</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
            </select>
          </div>
        )}

        {districtId && areas.length > 0 && (
          <div className="card">
            <label className="block text-sm font-bold mb-2">المنطقة</label>
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="input">
              <option value="">— اختر —</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nameAr}</option>)}
            </select>
          </div>
        )}

        <div className="card">
          <label className="block text-sm font-bold mb-2">أقرب معلم</label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="بجانب مسجد الرحمة"
            className="input"
          />
        </div>

        <div className="card">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-5 h-5 accent-[var(--brand-red)]"
            />
            <span className="font-bold text-sm">اجعله العنوان الافتراضي</span>
          </label>
        </div>
      </main>

      <div className="sticky-bottom">
        <div className="sticky-bottom-inner flex gap-3">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost btn-lg flex-1">
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn btn-primary btn-lg flex-1"
          >
            {submitting ? '⏳ جاري...' : '💾 حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewAddressPage() {
  return (
    <Suspense fallback={<div className="app-shell bg-[var(--bg-base)]" />}>
      <NewAddressContent />
    </Suspense>
  );
}
