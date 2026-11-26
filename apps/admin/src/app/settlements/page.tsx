'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function SettlementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authFetch('/api/v1/finance/settlements?limit=100')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.message || body?.error || `تعذر تحميل التسويات (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then((d) => { if (active) setItems(Array.isArray(d.items) ? d.items : []); })
      .catch((e) => { if (active) setError(e.message || 'تعذر الاتصال بالخادم'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const columns = [
    { key: 'id', label: 'المعرف', render: (s: any) => <span className="font-mono text-xs" dir="ltr">{String(s.id || '').slice(0, 8)}...</span> },
    { key: 'party', label: 'الطرف', render: (s: any) => <span className="font-bold">{s.partyName || '—'}</span> },
    { key: 'amount', label: 'صافي المستحق', render: (s: any) => <span className="font-black text-accent">{Number(s.netAmount ?? 0).toLocaleString('ar-YE')} ر.ي</span> },
    { key: 'gross', label: 'الإجمالي', render: (s: any) => <span>{Number(s.grossAmount ?? 0).toLocaleString('ar-YE')} ر.ي</span> },
    { key: 'commission', label: 'العمولة', render: (s: any) => <span>{Number(s.commissionAmount ?? 0).toLocaleString('ar-YE')} ر.ي</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (s: any) => (
        <span className={`badge ${s.status === 'paid' ? 'badge-success' : s.status === 'approved' ? 'badge-info' : s.status === 'pending' ? 'badge-warning' : 'badge-danger'} text-[10px]`}>
          {s.status === 'paid' ? '✅ مدفوع' : s.status === 'approved' ? '👍 معتمد' : s.status === 'pending' ? '⏳ معلق' : s.status}
        </span>
      ),
    },
    { key: 'date', label: 'التاريخ', render: (s: any) => <span className="text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-YE') : '—'}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="💰 التسويات المالية" subtitle={`${items.length} تسوية`} />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-600">{error}</div>}
      <AdminTable columns={columns} data={items} keyField="id" loading={loading} emptyMessage={error ? 'تعذر تحميل التسويات' : 'لا توجد تسويات'} />
    </div>
  );
}
