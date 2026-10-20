'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/admin/audit-logs?limit=100')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setLogs(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'actor', label: 'المستخدم', render: (l: any) => <span className="text-xs">{l.actorName || l.userId?.slice(0, 8) || '—'}</span> },
    { key: 'action', label: 'الإجراء', render: (l: any) => <span className="badge badge-info text-[10px]">{l.action}</span> },
    { key: 'entity', label: 'الكيان', render: (l: any) => <span className="text-xs">{l.entityType} #{String(l.entityId || '').slice(0, 8)}</span> },
    { key: 'ip', label: 'IP', render: (l: any) => <span className="font-mono text-[10px]" dir="ltr">{l.ipAddress || '—'}</span> },
    { key: 'date', label: 'التاريخ', render: (l: any) => <span className="text-xs">{new Date(l.createdAt).toLocaleString('ar-YE')}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="📝 Audit Logs" subtitle={`${logs.length} حدث`} />
      <AdminTable columns={columns} data={logs} keyField="id" loading={loading} emptyMessage="لا توجد سجلات" />
    </div>
  );
}
