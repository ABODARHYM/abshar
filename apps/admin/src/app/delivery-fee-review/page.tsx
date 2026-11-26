'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { authFetch } from '@/lib/auth';

type ReviewOrder = {
  orderId: string; orderNumber?: string; driverName?: string; storeName?: string;
  customerDeliveryFee: number | null; originalDeliveryFee: number | null;
  currency?: string; deliveredAt?: string | null;
  hasFinancialHistory?: boolean; reviewStatus?: string;
};

export default function DeliveryFeeReviewPage() {
  const [items, setItems] = useState<ReviewOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await authFetch('/api/v1/finance/review/unverified-delivery-fees?limit=100');
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `فشل تحميل المراجعات (HTTP ${response.status})`);
      setItems(Array.isArray(body?.items) ? body.items : []);
    } catch (e: any) { setError(e?.message || 'تعذر الاتصال بالخادم'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function verify(item: ReviewOrder) {
    const amountText = amounts[item.orderId]?.trim() ?? '';
    const reason = reasons[item.orderId]?.trim() ?? '';
    const amount = Number(amountText);
    if (!amountText || !Number.isFinite(amount) || amount < 0) {
      setError('أدخل الرسم الأصلي المؤكد رقمياً، ولا تتركه فارغاً.'); return;
    }
    if (reason.length < 8) { setError('اكتب سبب التحقق (8 أحرف على الأقل).'); return; }
    if (item.customerDeliveryFee !== null && amount < item.customerDeliveryFee) {
      setError('الرسم الأصلي لا يمكن أن يكون أقل من رسم العميل.'); return;
    }
    if (!window.confirm('تأكيد الرسم المدخل وتسجيل اسمك وسبب المراجعة في سجل التدقيق؟')) return;
    setBusy(item.orderId); setError('');
    try {
      const response = await authFetch(`/api/v1/finance/review/orders/${item.orderId}/verify-delivery-fee`, {
        method: 'POST', body: JSON.stringify({ amount, reason }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `تعذر اعتماد المراجعة (HTTP ${response.status})`);
      setItems(current => current.filter(row => row.orderId !== item.orderId));
    } catch (e: any) { setError(e?.message || 'تعذر حفظ المراجعة'); }
    finally { setBusy(null); }
  }

  return (
    <main className="p-4 md:p-6 space-y-4">
      <AdminHeader title="مراجعة رسوم التوصيل غير المؤكدة" subtitle="اعتماد الرسم من مصدر موثوق مع توثيق سبب المراجعة" />
      <div className="card p-4 border border-amber-500/30">
        <strong>تنبيه محاسبي:</strong> لا تعتمد رسماً تقديرياً. أدخل القيمة بعد مطابقتها مع مصدر موثوق. الاعتماد يثبت قيمة الطلب ويسجل العملية في سجل التدقيق، ولا يعيد كتابة العمولات أو القيود المالية السابقة.
      </div>
      {error && <div role="alert" className="card p-3 border border-red-500/40 text-red-500">{error}</div>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--text-muted)]">{items.length} طلبات بانتظار المراجعة</span>
        <button onClick={() => void load()} className="btn btn-secondary" disabled={loading}>تحديث</button>
      </div>
      {loading ? <div className="card p-6 text-center">جارٍ تحميل الطلبات…</div> :
        items.length === 0 ? <div className="card p-8 text-center">لا توجد طلبات بانتظار المراجعة.</div> :
        <div className="grid gap-4">
          {items.map(item => (
            <section key={item.orderId} className="card p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div><div className="font-black">طلب {item.orderNumber || item.orderId.slice(0, 8)}</div><div className="text-sm text-[var(--text-muted)]">{item.storeName || 'متجر غير محدد'} · المندوب: {item.driverName || '—'}</div></div>
                <span className={item.hasFinancialHistory ? "badge badge-danger" : "badge badge-warning"}>
                {item.hasFinancialHistory ? "يتطلب تسوية محاسبية" : "معلق للمراجعة"}
              </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>رسم العميل: <strong>{item.customerDeliveryFee ?? 'غير متوفر'} {item.currency || ''}</strong></div>
                <div>الرسم الأصلي المسجل: <strong>{item.originalDeliveryFee ?? 'غير معروف'} {item.currency || ''}</strong></div>
              </div>
              {item.hasFinancialHistory && <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                توجد عمولة أو حركات مالية سابقة لهذا الطلب. لا يمكن اعتماد الرسم من هذه الشاشة؛ يلزم مسار تسوية محاسبية مستقل يحافظ على القيود التاريخية.
              </div>}
              <label className="block text-sm font-bold">الرسم الأصلي المؤكد ({item.currency || 'عملة الطلب'})
                <input className="input w-full mt-1" inputMode="decimal" type="number" min="0" step="0.01" value={amounts[item.orderId] ?? ''} onChange={e => setAmounts(v => ({...v, [item.orderId]: e.target.value}))} placeholder="أدخل القيمة من المصدر المعتمد" />
              </label>
              <label className="block text-sm font-bold">مصدر التحقق وسبب الاعتماد
                <textarea className="input w-full mt-1 min-h-20" value={reasons[item.orderId] ?? ''} onChange={e => setReasons(v => ({...v, [item.orderId]: e.target.value}))} placeholder="مثال: مطابقة فاتورة الطلب وسجل عرض التوصيل…" />
              </label>
              <button className="btn btn-primary w-full" disabled={busy === item.orderId || Boolean(item.hasFinancialHistory)} onClick={() => void verify(item)}>
                {busy === item.orderId ? 'جارٍ حفظ المراجعة…' : item.hasFinancialHistory ? 'الاعتماد العادي غير متاح' : 'اعتماد الرسم وتوثيق المراجعة'}
              </button>
            </section>
          ))}
        </div>}
    </main>
  );
}
