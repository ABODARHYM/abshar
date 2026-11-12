'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    authFetch('/api/v1/admin/stores?limit=100')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setStores(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = stores.filter((s) =>
    !search.trim() || (s.nameAr || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'المتجر',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
            {s.logoUrl ? <img src={s.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🏪</div>}
          </div>
          <div>
            <div className="font-bold">{s.nameAr}</div>
            <div className="text-xs text-muted">{s.addressText || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'rating', label: 'التقييم', render: (s: any) => <span>⭐ {Number(s.ratingAvg || 0).toFixed(1)}</span> },
    {
      key: 'status',
      label: 'الحالة',
      render: (s: any) => (
        <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
          {s.status === 'active' ? '✅ نشط' : '❌ موقوف'}
        </span>
      ),
    },
    { key: 'actions', label: '', render: () => <span className="text-accent text-xs">←</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="🏪 المتاجر" subtitle={`${filtered.length} متجر`} />
      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث..." className="input max-w-md" />
      </div>
      <AdminTable
        columns={columns}
        data={filtered}
        keyField="id"
        loading={loading}
        emptyMessage="لا توجد متاجر"
        onRowClick={(s: any) => router.push(`/stores/${s.id}`)}
      />
    </div>
  );
}
