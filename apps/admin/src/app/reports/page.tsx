'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { authFetch } from '@/lib/auth';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/admin/dashboard')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => Number(v || 0).toLocaleString('en-US');

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader title="📈 التقارير" subtitle="تحليلات المنصة" />

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReportCard icon="📦" label="طلبات اليوم" value={fmt(stats.todayOrders)} />
            <ReportCard icon="💰" label="إيرادات اليوم" value={`${fmt(stats.todayRevenue)} ر.ي`} />
            <ReportCard icon="⏳" label="قيد التنفيذ" value={fmt(stats.pendingOrders)} />
            <ReportCard icon="💎" label="إجمالي الإيرادات" value={`${fmt(stats.totalRevenue)} ر.ي`} />
          </div>

          <div className="card">
            <h3 className="font-black mb-4">📊 إحصائيات المنصة</h3>
            <div className="space-y-3">
              <Row label="المستخدمون" value={fmt(stats.totalUsers)} />
              <Row label="المتاجر" value={`${fmt(stats.activeStores)} / ${fmt(stats.totalStores)}`} />
              <Row label="المندوبون" value={`${fmt(stats.activeDrivers)} / ${fmt(stats.totalDrivers)}`} />
              <Row label="الطلبات" value={fmt(stats.totalOrders)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({ icon, label, value }: any) {
  return (
    <div className="card">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xl font-black mb-1">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--bg-border)] last:border-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
