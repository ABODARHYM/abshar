'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    authFetch('/api/v1/admin/users?limit=100')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setUsers(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.fullName || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.phone || '').includes(q);
  });

  const columns = [
    {
      key: 'name',
      label: 'الاسم',
      render: (u: any) => (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center font-black text-accent flex-shrink-0">
            {u.fullName?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate">{u.fullName}</div>
            <div className="text-xs text-muted truncate" dir="ltr">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'الهاتف', render: (u: any) => <span dir="ltr" className="font-mono text-xs">{u.phone}</span> },
    {
      key: 'roles',
      label: 'الأدوار',
      render: (u: any) => (
        <div className="flex gap-1 flex-wrap">
          {(u.roles || []).slice(0, 2).map((r: string) => <span key={r} className="badge badge-accent text-[10px]">{r}</span>)}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (u: any) => (
        <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
          {u.status === 'active' ? '✅ نشط' : '❌ موقوف'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (u: any) => <span className="text-accent text-xs">←</span>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="👥 المستخدمون" subtitle={`${filtered.length} مستخدم`} />
      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث..." className="input max-w-md" />
      </div>
      <AdminTable
        columns={columns}
        data={filtered}
        keyField="id"
        loading={loading}
        emptyMessage="لا يوجد مستخدمون"
        onRowClick={(u: any) => router.push(`/users/${u.id}`)}
      />
    </div>
  );
}
