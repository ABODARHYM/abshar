'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function SettlementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/finance/settlements?limit=100')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'id', label: 'المعرف', render: (s: any) => <span className="font-mono text-xs" dir="ltr">{String(s.id || '').slice(0, 8)}...</span> },
    { key: 'party', label: 'الطرف', render: (s: any) => <span className="font-bold">{s.partyName || s.storeName || '—'}</span> },
    { key: 'amount', label: 'المبلغ', render: (s: any) => <span className="font-black text-accent">{Number(s.amount || 0).toFixed(0)} ر.ي</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (s: any) => (
        <span className={`badge ${s.status === 'paid' ? 'badge-success' : s.status === 'approved' ? 'badge-info' : s.status === 'pending' ? 'badge-warning' : 'badge-danger'} text-[10px]`}>
          {s.status === 'paid' ? '✅ مدفوع' : s.status === 'approved' ? '👍 معتمد' : s.status === 'pending' ? '⏳ معلق' : s.status}
        </span>
      ),
    },
    { key: 'date', label: 'التاريخ', render: (s: any) => <span className="text-xs">{new Date(s.createdAt).toLocaleDateString('ar-YE')}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="💰 التسويات المالية" subtitle={`${items.length} تسوية`} />
      <AdminTable columns={columns} data={items} keyField="id" loading={loading} emptyMessage="لا توجد تسويات" />
    </div>
  );
}
