'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/coupons?limit=100')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setCoupons(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'code', label: 'الكود', render: (c: any) => <span className="font-mono font-black text-accent" dir="ltr">{c.code}</span> },
    {
      key: 'type',
      label: 'النوع',
      render: (c: any) => (
        <span className="badge badge-info text-[10px]">
          {c.discountType === 'percent' ? '% نسبة' : c.discountType === 'fixed' ? '💵 مبلغ' : '🚚 توصيل'}
        </span>
      ),
    },
    { key: 'value', label: 'القيمة', render: (c: any) => <span className="font-bold">{c.discountValue}</span> },
    { key: 'uses', label: 'الاستخدامات', render: (c: any) => <span>{c.usedCount || 0} / {c.maxUses || '∞'}</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (c: any) => (
        <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'} text-[10px]`}>
          {c.isActive ? '✅ نشط' : '❌ معطل'}
        </span>
      ),
    },
    { key: 'expires', label: 'ينتهي', render: (c: any) => <span className="text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-YE') : '—'}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="🎫 الكوبونات" subtitle={`${coupons.length} كوبون`} />
      <AdminTable columns={columns} data={coupons} keyField="id" loading={loading} emptyMessage="لا توجد كوبونات" />
    </div>
  );
}
