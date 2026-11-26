'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminHeader from '@/components/AdminHeader';
import { authFetch } from '@/lib/auth';

type City = { id: string; nameAr: string; nameEn: string; latitude?: number; longitude?: number; geographyStatus?: 'verified' | 'legacy_unverified' };
type Zone = {
  id: string; city: string; city_id: string | null; name_ar: string; name_en: string;
  district_id: string | null; district_source_status?: string | null;
  coverage_status?: 'unverified' | 'verified' | 'rejected'; is_active: boolean;
};

const INITIAL_CENTER: [number, number] = [15.4633, 45.3256];

export default function DeliveryCoveragePage() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cityId, setCityId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [points, setPoints] = useState<Array<[number, number]>>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedCity = useMemo(() => cities.find((city) => city.id === cityId), [cities, cityId]);
  const selectedZone = useMemo(() => zones.find((zone) => zone.id === zoneId), [zones, zoneId]);
  const selectedZoneIsLegacy = Boolean(selectedZone?.district_id
    && selectedZone.district_source_status !== 'verified'
    && selectedZone.district_source_status !== 'community_verified');

  const loadData = async () => {
    const [cityResponse, zoneResponse] = await Promise.all([
      authFetch('/api/v1/geography/admin/cities'),
      authFetch('/api/v1/pricing/zones/admin'),
    ]);
    if (!cityResponse.ok || !zoneResponse.ok) throw new Error('تعذر تحميل المدن ومناطق التوصيل أو لا تملك صلاحية إدارة المناطق.');
    const [cityData, zoneData] = await Promise.all([cityResponse.json(), zoneResponse.json()]);
    const cityRows = Array.isArray(cityData) ? cityData : [];
    const zoneRows = Array.isArray(zoneData) ? zoneData : [];
    setCities(cityRows);
    setZones(zoneRows);
    if (!cityId && cityRows[0]?.id) setCityId(cityRows[0].id);
    if (!zoneId && zoneRows.find((zone: Zone) => !zone.district_id)?.id) {
      setZoneId(zoneRows.find((zone: Zone) => !zone.district_id).id);
    }
  };

  useEffect(() => {
    let active = true;
    loadData().catch((e) => { if (active) setError(e instanceof Error ? e.message : 'حدث خطأ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;
    import('leaflet').then((L) => {
      if (disposed || !mapElement.current || mapRef.current) return;
      map = L.map(mapElement.current).setView(INITIAL_CENTER, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      layerRef.current = layer;
      map.on('click', (event: LeafletMouseEvent) => {
        setPoints((current) => [...current, [event.latlng.lng, event.latlng.lat]]);
      });
      mapRef.current = map;
    }).catch(() => setError('تعذر تحميل الخريطة. تحقق من اتصال الإنترنت.'));
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedCity || !mapRef.current) return;
    const lat = Number(selectedCity.latitude);
    const lng = Number(selectedCity.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) mapRef.current.setView([lat, lng], 13);
  }, [selectedCity]);

  useEffect(() => {
    let active = true;
    import('leaflet').then((L) => {
      if (!active || !layerRef.current) return;
      const layer = layerRef.current;
      layer.clearLayers();
      points.forEach(([lng, lat], index) => {
        L.circleMarker([lat, lng], { radius: 5, weight: 2 }).bindTooltip(String(index + 1)).addTo(layer);
      });
      if (points.length >= 3) {
        const latLngs = points.map(([lng, lat]) => [lat, lng] as [number, number]);
        L.polygon(latLngs, { color: '#16a34a', weight: 3, fillOpacity: 0.15 }).addTo(layer);
      } else if (points.length >= 2) {
        L.polyline(points.map(([lng, lat]) => [lat, lng] as [number, number]), { color: '#16a34a', weight: 3 }).addTo(layer);
      }
    });
    return () => { active = false; };
  }, [points]);

  const createZone = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await authFetch('/api/v1/pricing/zones', {
        method: 'POST', body: JSON.stringify({ cityId, nameAr, nameEn }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر إنشاء المنطقة');
      setNameAr(''); setNameEn('');
      await loadData();
      setZoneId(body.id);
      setPoints([]);
      setMessage('تم إنشاء المنطقة كمسودة غير نشطة. ارسم حدودها ثم اعتمدها.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء المنطقة'); }
    finally { setSaving(false); }
  };

  const saveCoverage = async () => {
    if (!zoneId || points.length < 3 || !note.trim()) {
      setError('اختر منطقة، وحدد ثلاثة نقاط على الأقل، واكتب ملاحظة توثيق.'); return;
    }
    if (selectedZoneIsLegacy) {
      setError('لا يمكن اعتماد سجل منطقة مرتبط بحي قديم غير موثق. أنشئ منطقة تشغيلية جديدة.'); return;
    }
    const ring = [...points, points[0]];
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await authFetch(`/api/v1/pricing/zones/${zoneId}/coverage`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'verified',
          geojson: { type: 'Polygon', coordinates: [ring] },
          note: note.trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر اعتماد حدود التغطية');
      await loadData();
      setPoints([]);
      setMessage('تم حفظ حدود التغطية واعتمادها. المنطقة ما زالت غير نشطة حتى إعداد شرائح الرسوم ومزود الطرق.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ الحدود'); }
    finally { setSaving(false); }
  };

  const revokeCoverage = async () => {
    if (!zoneId || !confirm('سيتم إيقاف أهلية التوصيل لهذه المنطقة فوراً. هل تريد المتابعة؟')) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await authFetch(`/api/v1/pricing/zones/${zoneId}/coverage`, {
        method: 'PATCH', body: JSON.stringify({ status: 'unverified', geojson: null, note: 'تم إلغاء اعتماد التغطية من الإدارة' }),
      });
      if (!response.ok) throw new Error('تعذر إلغاء اعتماد التغطية');
      await loadData();
      setMessage('تم إلغاء اعتماد التغطية. لن تقبل المنطقة طلبات توصيل.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إلغاء الاعتماد'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <AdminHeader title="🗺️ مناطق التغطية الجغرافية" subtitle="إنشاء نطاقات تشغيلية ورسم حدودها واعتمادها يدوياً" />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-500">{error}</div>}
      {message && <div role="status" className="card mb-4 border border-emerald-500/40 text-emerald-600">{message}</div>}

      {cities.some((city) => city.geographyStatus === 'legacy_unverified') && <div role="note" className="card mb-4 border border-amber-500/40 text-amber-600">تظهر هنا مدن قديمة غير موثقة لأغراض إعداد التشغيل فقط. لن تظهر للعملاء ولن تصبح قابلة للاختيار العام حتى توثيق المحافظة وربط المدينة بها.</div>}
      <section className="card p-4 mb-4">
        <h2 className="font-black mb-3">إنشاء منطقة تشغيلية جديدة</h2>
        <form onSubmit={createZone} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="text-sm">المدينة
            <select className="input w-full mt-1" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
              <option value="">اختر المدينة</option>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.nameAr}{city.geographyStatus === 'legacy_unverified' ? ' — سجل قديم غير موثق (للإدارة فقط)' : ''}</option>)}
            </select>
          </label>
          <label className="text-sm">اسم المنطقة بالعربية
            <input className="input w-full mt-1" value={nameAr} onChange={(e) => setNameAr(e.target.value)} minLength={2} maxLength={120} required />
          </label>
          <label className="text-sm">اسم المنطقة بالإنجليزية
            <input className="input w-full mt-1" value={nameEn} onChange={(e) => setNameEn(e.target.value)} minLength={2} maxLength={120} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving || !cityId}>{saving ? 'جارٍ الحفظ...' : 'إنشاء مسودة منطقة'}</button>
        </form>
        <p className="text-xs text-[var(--text-muted)] mt-3">إنشاء المنطقة لا يفعّلها ولا يحدد رسوماً. يجب رسم حدود صحيحة، ثم إعداد شرائح المسافة ومزود الطرق قبل التفعيل.</p>
      </section>

      <section className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <label className="text-sm font-bold">المنطقة المراد رسم حدودها
            <select className="input w-full mt-1" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setPoints([]); }}>
              <option value="">اختر المنطقة</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id} disabled={Boolean(zone.district_id && zone.district_source_status !== 'verified' && zone.district_source_status !== 'community_verified')}>
                  {zone.city} — {zone.name_ar} {zone.coverage_status === 'verified' ? '— معتمدة' : '— غير معتمدة'}
                  {zone.district_id && zone.district_source_status !== 'verified' && zone.district_source_status !== 'community_verified' ? ' — سجل قديم محجوب' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">ملاحظة التوثيق
            <input className="input w-full mt-1" value={note} onChange={(e) => setNote(e.target.value)} minLength={8} placeholder="مثال: حدود النطاق راجعها واعتمدها مسؤول التشغيل" />
          </label>
        </div>
        {selectedZoneIsLegacy && <p className="text-sm text-amber-600 mb-3">هذا سجل قديم مرتبط بحي غير موثق، ولن يسمح النظام باعتماده. أنشئ منطقة جديدة مستقلة عنه.</p>}
        {selectedZone?.is_active && <p className="text-sm text-amber-600 mb-3">أوقف المنطقة من صفحة تعرفة التوصيل أولاً قبل تعديل حدودها. إلغاء الاعتماد يوقفها تلقائياً.</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn" onClick={() => setPoints((current) => current.slice(0, -1))} disabled={!points.length}>تراجع عن آخر نقطة</button>
          <button type="button" className="btn" onClick={() => setPoints([])} disabled={!points.length}>مسح الرسم</button>
          <span className="text-sm text-[var(--text-muted)] self-center">النقاط المحددة: {points.length} — انقر على الخريطة لرسم حدود المنطقة بالترتيب.</span>
        </div>
        <div ref={mapElement} className="w-full rounded-xl border border-[var(--bg-border)]" style={{ height: 440, zIndex: 0 }} />
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className="btn btn-primary" onClick={saveCoverage} disabled={saving || points.length < 3 || !zoneId || selectedZoneIsLegacy || selectedZone?.is_active}>
            {saving ? 'جارٍ الحفظ...' : 'اعتماد حدود التغطية'}
          </button>
          {selectedZone?.coverage_status === 'verified' && <button type="button" className="btn text-red-500" onClick={revokeCoverage} disabled={saving}>إلغاء اعتماد التغطية</button>}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-black mb-2">قواعد اعتماد المنطقة</h2>
        <ul className="list-disc pr-5 text-sm space-y-1 text-[var(--text-muted)]">
          <li>ارسم الحدود الحقيقية التي وافقت عليها الإدارة فقط؛ لا تستخدم حدوداً تقديرية.</li>
          <li>النقرات تُحفظ كـ GeoJSON بإحداثيات [خط الطول، خط العرض].</li>
          <li>المناطق القديمة المرتبطة بالأحياء الستة غير الموثقة لا يمكن اعتمادها.</li>
          <li>المنطقة المعتمدة لا تستقبل طلبات حتى تُضاف شرائح رسوم ويُضبط مزود مسافة الطريق وتُفعّل صراحةً.</li>
          <li>تداخل حدود منطقتين يجعل الإسناد التلقائي للعنوان غير محسوم؛ تجنب التداخل.</li>
        </ul>
      </section>
      {loading && <p className="text-sm text-[var(--text-muted)] mt-3">جارٍ تحميل بيانات المناطق...</p>}
    </div>
  );
}
