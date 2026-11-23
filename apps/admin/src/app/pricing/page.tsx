'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { authFetch } from '@/lib/auth';

type Zone = {
  id: string; city: string; name_ar: string; name_en?: string;
  district_id?: string | null; district_source_status?: string | null;
  coverage_status?: 'unverified' | 'verified' | 'rejected'; is_active?: boolean;
};
type Tier = {
  id: string; zone_id: string; min_distance_km: string | number;
  max_distance_km: string | number | null; delivery_fee: string | number; is_active: boolean;
};

const DISTANCE_BANDS = [
  { value: '0-2', label: '0 إلى 2 كم', min: 0, max: 2 },
  { value: '2-4', label: 'أكثر من 2 إلى 4 كم', min: 2, max: 4 },
  { value: '4-6', label: 'أكثر من 4 إلى 6 كم', min: 4, max: 6 },
  { value: '6-10', label: 'أكثر من 6 إلى 10 كم', min: 6, max: 10 },
  { value: '10-15', label: 'أكثر من 10 إلى 15 كم', min: 10, max: 15 },
  { value: '15+', label: 'أكثر من 15 كم (حتى حدود التغطية)', min: 15, max: null },
];

export default function PricingPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [routingConfigured, setRoutingConfigured] = useState(false);
  const [form, setForm] = useState({ band: '0-2', deliveryFee: '' });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState('');

  const loadZones = useCallback(async () => {
    const [response, routingResponse] = await Promise.all([
      authFetch('/api/v1/pricing/zones/admin'),
      authFetch('/api/v1/pricing/routing/status'),
    ]);
    if (!response.ok) throw new Error('تعذر تحميل مناطق التوصيل');
    const data = await response.json();
    const routingData = routingResponse.ok ? await routingResponse.json() : { configured: false };
    setRoutingConfigured(routingData.configured === true);
    const rows = Array.isArray(data) ? data : [];
    setZones(rows);
    const usable = rows.find((zone: Zone) => !zone.district_id
      || zone.district_source_status === 'verified' || zone.district_source_status === 'community_verified');
    if ((!zoneId || !rows.some((zone: Zone) => zone.id === zoneId)) && usable?.id) setZoneId(usable.id);
  }, [zoneId]);

  const loadTiers = useCallback(async () => {
    if (!zoneId) { setTiers([]); return; }
    const response = await authFetch(`/api/v1/pricing/zones/${zoneId}/distance-tiers`);
    if (!response.ok) throw new Error('تعذر تحميل شرائح المسافة');
    const data = await response.json();
    setTiers(Array.isArray(data) ? data : []);
  }, [zoneId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadZones();
        if (active) setError('');
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'حدث خطأ');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadZones]);

  useEffect(() => {
    let active = true;
    loadTiers().catch((e) => { if (active) setError(e instanceof Error ? e.message : 'تعذر تحميل الشرائح'); });
    return () => { active = false; };
  }, [loadTiers]);

  const createTier = async (event: FormEvent) => {
    event.preventDefault();
    if (!zoneId) return;
    setSaving(true); setError('');
    try {
      const band = DISTANCE_BANDS.find((item) => item.value === form.band)!;
      const response = await authFetch(`/api/v1/pricing/zones/${zoneId}/distance-tiers`, {
        method: 'POST',
        body: JSON.stringify({
          minDistanceKm: band.min,
          maxDistanceKm: band.max,
          deliveryFee: Number(form.deliveryFee),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر حفظ شريحة المسافة');
      const nextBand = DISTANCE_BANDS.find((item) => item.min === band.max);
      setForm({ band: nextBand?.value ?? '0-2', deliveryFee: '' });
      await loadTiers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الشريحة');
    } finally { setSaving(false); }
  };

  const saveTierFee = async (id: string) => {
    const fee = Number(editingFee);
    if (!editingFee.trim() || !Number.isFinite(fee) || fee < 0) {
      setError('أدخل رسوماً صحيحة لا تقل عن صفر.');
      return;
    }
    if (!confirm('سيُطبّق المبلغ الجديد على الطلبات القادمة فقط، ولن تتغير رسوم الطلبات السابقة. هل تريد المتابعة؟')) return;
    setSaving(true); setError('');
    try {
      const response = await authFetch(`/api/v1/pricing/distance-tiers/${id}`, {
        method: 'PATCH', body: JSON.stringify({ deliveryFee: fee }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر تعديل رسوم الشريحة');
      setEditingTierId(null); setEditingFee('');
      await loadTiers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تعديل رسوم الشريحة');
    } finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    if (!confirm('هل تريد إيقاف هذه الشريحة؟')) return;
    setSaving(true); setError('');
    try {
      const response = await authFetch(`/api/v1/pricing/distance-tiers/${id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر إيقاف الشريحة');
      await loadTiers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إيقاف الشريحة');
    } finally { setSaving(false); }
  };

  const reactivate = async (id: string) => {
    setSaving(true); setError('');
    try {
      const response = await authFetch(`/api/v1/pricing/distance-tiers/${id}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر إعادة تفعيل الشريحة؛ تحقق من عدم تداخلها مع شريحة نشطة.');
      await loadTiers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إعادة تفعيل الشريحة');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <AdminHeader title="🚚 تعرفة التوصيل" subtitle="شرائح المسافة لكل مدينة ومنطقة" />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-600">{error}</div>}
      <section className="card p-4 mb-5">
        <label className="block text-sm font-bold mb-2">مدينة / منطقة التوصيل</label>
        <select className="input w-full" value={zoneId} onChange={(e) => {
          setZoneId(e.target.value); setEditingTierId(null); setEditingFee('');
        }}>
          <option value="">اختر المنطقة</option>
          {zones.map((z) => {
            const legacy = Boolean(z.district_id && z.district_source_status !== 'verified' && z.district_source_status !== 'community_verified');
            return <option key={z.id} value={z.id} disabled={legacy}>{z.city} — {z.name_ar}{legacy ? ' — سجل قديم غير موثق' : z.coverage_status === 'verified' ? ' — حدود معتمدة' : ' — الحدود غير معتمدة'}</option>;
          })}
        </select>
        {!loading && zones.length === 0 && <p className="text-sm text-amber-500 mt-2">لا توجد مناطق تشغيلية. أنشئ منطقة وارسم حدودها من صفحة مناطق التغطية.</p>}
        {zones.length > 0 && <p className="text-xs text-[var(--text-muted)] mt-2">تظهر السجلات القديمة للقراءة فقط؛ أنشئ مناطق تشغيلية جديدة من صفحة «مناطق التغطية».</p>}
      </section>
      {zoneId && (() => {
        const selected = zones.find((z) => z.id === zoneId);
        const legacy = Boolean(selected?.district_id && selected.district_source_status !== 'verified' && selected.district_source_status !== 'community_verified');
        const missingBands = DISTANCE_BANDS.filter((band) => !tiers.some((tier) =>
          tier.is_active && Number(tier.min_distance_km) === band.min
          && (tier.max_distance_km === null ? null : Number(tier.max_distance_km)) === band.max,
        ));
        const hasActiveTier = tiers.some((tier) => tier.is_active);
        const canActivate = selected?.coverage_status === 'verified' && !legacy
          && hasActiveTier && routingConfigured;
        return <section className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold">حالة تشغيل المنطقة</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">التغطية: {selected?.coverage_status === 'verified' ? 'معتمدة' : 'غير معتمدة'} — التشغيل: {selected?.is_active ? 'نشط' : 'متوقف'}</div>
            <div className="text-xs mt-1">شرائح الرسوم: {6 - missingBands.length}/6 مهيأة — مزود الطرق: {routingConfigured ? 'ORS مضبوط' : 'غير مهيأ'}</div>
            {!selected?.is_active && missingBands.length > 0 && <div className="text-xs text-amber-600 mt-1">شرائح لم تُسعّر بعد؛ الطلبات التي تقع مسافاتها ضمنها ستُرفض حتى إضافة رسومها: {missingBands.map((band) => band.label).join('، ')}</div>}
            {!selected?.is_active && !routingConfigured && <div className="text-xs text-amber-600 mt-1">يجب ضبط عنوان ORS الرسمي ومفتاح ROUTING_API_KEY في إعدادات Backend Staging.</div>}
          </div>
          <button type="button" className="btn btn-primary" disabled={saving || legacy || (selected?.is_active ? false : !canActivate)} onClick={async () => {
            setSaving(true); setError('');
            try {
              const response = await authFetch(`/api/v1/pricing/zones/${zoneId}`, { method: 'PATCH', body: JSON.stringify({ isActive: !selected?.is_active }) });
              const body = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(body.message || 'تعذر تغيير حالة المنطقة');
              await loadZones();
            } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تغيير حالة المنطقة'); }
            finally { setSaving(false); }
          }}>{selected?.is_active ? 'إيقاف المنطقة' : 'تفعيل المنطقة بعد اكتمال المتطلبات'}</button>
        </section>;
      })()}

      <section className="card p-4 mb-5">
        <h2 className="font-black mb-3">إضافة شريحة مسافة</h2>
        <form onSubmit={createTier} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="text-sm">شريحة المسافة
            <select className="input w-full mt-1" value={form.band} onChange={(e) => setForm({ ...form, band: e.target.value })}>
              {DISTANCE_BANDS.map((band) => <option key={band.value} value={band.value}>{band.label}</option>)}
            </select>
          </label>
          <label className="text-sm">رسوم التوصيل
            <input className="input w-full mt-1" type="number" min="0" step="0.01" required value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={saving || !zoneId || !form.deliveryFee}>{saving ? 'جارٍ الحفظ...' : 'إضافة الشريحة'}</button>
        </form>
        <p className="text-xs text-[var(--text-muted)] mt-3">الحدود ثابتة ومعتمدة؛ أدخل رسوم كل شريحة فقط. الشريحة الأخيرة لا تتجاوز حدود التغطية الجغرافية المعتمدة.</p>
        <p className="text-xs text-[var(--text-muted)] mt-3">تُحسب الرسوم من مسافة الطريق عبر مزود التوجيه المهيأ. لا تُضاف أسعار افتراضية، وأضف الشرائح المطلوبة لتغطية مسافات المنطقة؛ أي مسافة لا تطابق شريحة نشطة لن تحصل على عرض سعر.</p>
        <p className="text-xs mt-2">حالة إعداد عنوان مزود الطرق: {routingConfigured ? 'عنوان HTTPS مضبوط (لم يُجرَ اختبار اتصال فعلي بعد)' : 'غير مهيأ أو غير صالح — يجب ضبط ROUTING_API_URL وROUTING_API_KEY في Render.'}</p>
      </section>
      <section className="card p-4">
        <h2 className="font-black mb-3">الشرائح المسجلة</h2>
        {tiers.length === 0 ? <p className="text-sm text-[var(--text-muted)]">{loading ? 'جارٍ التحميل...' : 'لا توجد شرائح لهذه المنطقة بعد.'}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-right border-b"><th className="p-2">من (كم)</th><th className="p-2">إلى (كم)</th><th className="p-2">الرسوم</th><th className="p-2">الحالة</th><th className="p-2">إجراء</th></tr></thead>
              <tbody>{tiers.map((t) => <tr key={t.id} className="border-b">
                <td className="p-2">{Number(t.min_distance_km).toFixed(2)}</td>
                <td className="p-2">{t.max_distance_km === null ? 'مفتوح' : Number(t.max_distance_km).toFixed(2)}</td>
                <td className="p-2 font-bold">
                  {editingTierId === t.id
                    ? <input aria-label="رسوم الشريحة الجديدة" className="input w-28" type="number" min="0" step="0.01"
                        value={editingFee} onChange={(e) => setEditingFee(e.target.value)} />
                    : Number(t.delivery_fee).toLocaleString('ar-YE')}
                </td>
                <td className="p-2">{t.is_active ? 'نشطة' : 'متوقفة'}</td>
                <td className="p-2 whitespace-nowrap">
                  {editingTierId === t.id ? <>
                    <button type="button" className="text-emerald-600 font-bold ml-3" disabled={saving} onClick={() => saveTierFee(t.id)}>حفظ</button>
                    <button type="button" className="text-[var(--text-muted)] font-bold" disabled={saving} onClick={() => { setEditingTierId(null); setEditingFee(''); }}>إلغاء</button>
                  </> : <>
                    <button type="button" className="text-blue-600 font-bold ml-3" disabled={saving} onClick={() => { setEditingTierId(t.id); setEditingFee(String(t.delivery_fee)); }}>تعديل الرسوم</button>
                    {t.is_active
                      ? <button type="button" className="text-red-500 font-bold ml-3" disabled={saving} onClick={() => deactivate(t.id)}>إيقاف</button>
                      : <button type="button" className="text-emerald-600 font-bold" disabled={saving} onClick={() => reactivate(t.id)}>إعادة تفعيل</button>}
                  </>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
