'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/admin/drivers?limit=100')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setDrivers(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'suspended' : 'active';
    if (!confirm(`تغيير حالة المندوب إلى ${newStatus}؟`)) return;
    try {
      const res = await authFetch(`/api/v1/admin/drivers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setDrivers(drivers.map((d) => d.userId === id || d.id === id ? { ...d, status: newStatus } : d));
      }
    } catch {}
  };

  const columns = [
    {
      key: 'name',
      label: 'المندوب',
      render: (d: any) => (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center text-success font-black flex-shrink-0">
            🛵
          </div>
          <div>
            <div className="font-bold">{d.fullName || 'مندوب'}</div>
            <div className="text-xs text-[var(--text-muted)]" dir="ltr">{d.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'availability',
      label: 'التوفر',
      render: (d: any) => (
        <span className={`badge ${d.availability === 'online' ? 'badge-success' : d.availability === 'busy' ? 'badge-warning' : 'badge-gray'} text-[10px]`}>
          {d.availability === 'online' ? '🟢 متصل' : d.availability === 'busy' ? '🟡 مشغول' : '⚪ غير متصل'}
        </span>
      ),
    },
    { key: 'rating', label: 'التقييم', render: (d: any) => <span>⭐ {Number(d.ratingAvg || 0).toFixed(1)}</span> },
    { key: 'vehicle', label: 'المركبة', render: (d: any) => <span className="text-xs">{d.vehicleType || '—'}</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (d: any) => (
        <span className={`badge ${d.status === 'active' ? 'badge-success' : d.status === 'pending' ? 'badge-warning' : 'badge-danger'} text-[10px]`}>
          {d.status === 'active' ? '✅ نشط' : d.status === 'pending' ? '⏳ معلق' : '❌ موقوف'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (d: any) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleStatus(d.userId || d.id, d.status); }}
          className={`btn btn-sm ${d.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
        >
          {d.status === 'active' ? '🚫 إيقاف' : '✅ تفعيل'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="🛵 المندوبون" subtitle={`${drivers.length} مندوب`} />
      <AdminTable columns={columns} data={drivers} keyField="userId" loading={loading} emptyMessage="لا يوجد مندوبون" />
    </div>
  );
}
