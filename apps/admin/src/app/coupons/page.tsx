'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

const COUPON_TYPE_LABELS: Record<string, string> = {
  percentage: '% نسبة',
  fixed: '💵 مبلغ',
  free_delivery: '🚚 توصيل مجاني',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authFetch('/api/v1/coupons?limit=100')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.message || body?.error || `تعذر تحميل الكوبونات (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then((d) => { if (active) setCoupons(Array.isArray(d.items) ? d.items : []); })
      .catch((e) => { if (active) setError(e.message || 'تعذر الاتصال بالخادم'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const columns = [
    { key: 'code', label: 'الكود', render: (c: any) => <span className="font-mono font-black text-accent" dir="ltr">{c.code}</span> },
    { key: 'type', label: 'النوع', render: (c: any) => <span className="badge badge-info text-[10px]">{COUPON_TYPE_LABELS[c.type] || c.type || '—'}</span> },
    { key: 'value', label: 'القيمة', render: (c: any) => <span className="font-bold">{Number(c.value ?? 0)}{c.type === 'percentage' ? '%' : ''}</span> },
    { key: 'uses', label: 'الاستخدامات', render: (c: any) => <span>{c.usedCount ?? 0} / {c.usageLimit ?? '∞'}</span> },
    { key: 'status', label: 'الحالة', render: (c: any) => <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'} text-[10px]`}>{c.isActive ? '✅ نشط' : '❌ معطل'}</span> },
    { key: 'expires', label: 'ينتهي', render: (c: any) => <span className="text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-YE') : '—'}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="🎫 الكوبونات" subtitle={`${coupons.length} كوبون`} />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-600">{error}</div>}
      <AdminTable columns={columns} data={coupons} keyField="id" loading={loading} emptyMessage={error ? 'تعذر تحميل الكوبونات' : 'لا توجد كوبونات'} />
    </div>
  );
}
