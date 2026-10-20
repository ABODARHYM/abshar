'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: '⏳ جديد', badge: 'badge-warning' },
  accepted: { label: '✅ مقبول', badge: 'badge-info' },
  preparing: { label: '👨‍🍳 تحضير', badge: 'badge-warning' },
  ready: { label: '🍽️ جاهز', badge: 'badge-info' },
  driverAssigned: { label: '🛵 مندوب', badge: 'badge-accent' },
  pickedUp: { label: '📦 مستلم', badge: 'badge-accent' },
  driverGoingToCustomer: { label: '🛣️ في الطريق', badge: 'badge-accent' },
  driverArrivedCustomer: { label: '📍 وصل', badge: 'badge-success' },
  delivered: { label: '🎉 تم', badge: 'badge-success' },
  cancelled: { label: '❌ ملغي', badge: 'badge-danger' },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    authFetch('/api/v1/admin/orders?limit=100')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setOrders(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 🆕 إعادة تحميل عند إشعار WebSocket
  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);


  const filtered = orders.filter((o) => filter === 'all' || o.status === filter);

  const columns = [
    { key: 'num', label: 'الطلب', render: (o: any) => <span className="font-mono text-xs font-bold" dir="ltr">#{o.orderNumber}</span> },
    { key: 'customer', label: 'العميل', render: (o: any) => <span className="text-sm">{o.customerName || '—'}</span> },
    { key: 'store', label: 'المتجر', render: (o: any) => <span className="text-sm">{o.storeName || '—'}</span> },
    { key: 'total', label: 'الإجمالي', render: (o: any) => <span className="font-black text-accent">{Number(o.total || 0).toFixed(0)} ر.ي</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (o: any) => {
        const st = STATUS_LABELS[o.status] || { label: o.status, badge: 'badge-gray' };
        return <span className={`badge ${st.badge} text-[10px]`}>{st.label}</span>;
      },
    },
    { key: 'actions', label: '', render: () => <span className="text-accent text-xs">←</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="📦 كل الطلبات" subtitle={`${filtered.length} طلب`} />
      <div className="mb-4 flex gap-2 flex-wrap">
        {['all', 'pending', 'accepted', 'preparing', 'ready', 'driverAssigned', 'delivered', 'cancelled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}>
            {f === 'all' ? 'الكل' : STATUS_LABELS[f]?.label || f}
          </button>
        ))}
      </div>
      <AdminTable
        columns={columns}
        data={filtered}
        keyField="id"
        loading={loading}
        emptyMessage="لا توجد طلبات"
        onRowClick={(o: any) => router.push(`/orders/${o.id}`)}
      />
    </div>
  );
}
