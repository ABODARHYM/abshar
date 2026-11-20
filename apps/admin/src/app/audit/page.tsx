'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authFetch('/api/v1/admin/audit-logs?limit=100')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.message || body?.error || `تعذر تحميل سجل التدقيق (HTTP ${r.status})`);
        }
        return r.json();
      })
      .then((d) => { if (active) setLogs(Array.isArray(d.items) ? d.items : []); })
      .catch((e) => { if (active) setError(e.message || 'تعذر الاتصال بالخادم'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const columns = [
    { key: 'actor', label: 'معرف المنفّذ', render: (l: any) => <span className="font-mono text-xs" dir="ltr">{(l.actorUserId || '—').toString().slice(0, 12)}</span> },
    { key: 'role', label: 'الصلاحية وقت الإجراء', render: (l: any) => <span className="text-xs">{l.actorRole || '—'}</span> },
    { key: 'action', label: 'الإجراء', render: (l: any) => <span className="badge badge-info text-[10px]">{l.action}</span> },
    { key: 'entity', label: 'الكيان', render: (l: any) => <span className="text-xs">{l.entityType} #{String(l.entityId || '').slice(0, 8)}</span> },
    { key: 'ip', label: 'IP', render: (l: any) => <span className="font-mono text-[10px]" dir="ltr">{l.ipAddress || '—'}</span> },
    { key: 'date', label: 'التاريخ', render: (l: any) => <span className="text-xs">{l.createdAt ? new Date(l.createdAt).toLocaleString('ar-YE') : '—'}</span> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="📝 Audit Logs" subtitle={`${logs.length} حدث`} />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-600">{error}</div>}
      <AdminTable columns={columns} data={logs} keyField="id" loading={loading} emptyMessage={error ? 'تعذر تحميل السجلات' : 'لا توجد سجلات'} />
    </div>
  );
}
