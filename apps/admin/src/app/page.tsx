'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

interface PlatformStats {
  totalUsers: number;
  totalStores: number;
  totalDrivers: number;
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  activeStores: number;
  activeDrivers: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/v1/admin/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
        else setError('فشل تحميل البيانات');
      })
      .catch(() => setError('خطأ في الاتصال'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v?: number) => Number(v || 0).toLocaleString('en-US');

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1">📊 لوحة التحكم</h1>
        <p className="text-sm text-[var(--text-muted)]">نظرة شاملة على منصة ABSHER BI</p>
      </div>

      {error && (
        <div className="card border-r-4 border-r-red-500 mb-4">
          <p className="text-sm font-bold text-red-400">⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="👥" label="المستخدمون" value={fmt(stats?.totalUsers)} />
            <StatCard icon="🏪" label="المتاجر" value={fmt(stats?.totalStores)} />
            <StatCard icon="🛵" label="المندوبون" value={fmt(stats?.totalDrivers)} />
            <StatCard icon="📦" label="الطلبات" value={fmt(stats?.totalOrders)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card card-accent">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📦</span>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">طلبات اليوم</div>
                  <div className="text-3xl font-black">{fmt(stats?.todayOrders)}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💰</span>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">إيرادات اليوم</div>
                  <div className="text-3xl font-black">{fmt(stats?.todayRevenue)} <span className="text-sm">ر.ي</span></div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <div>
                  <div className="text-xs text-[var(--text-muted)]">قيد التنفيذ</div>
                  <div className="text-3xl font-black">{fmt(stats?.pendingOrders)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-black mb-4">🏪 المتاجر النشطة</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">من {fmt(stats?.totalStores)}</span>
                <span className="text-3xl font-black text-accent">{fmt(stats?.activeStores)}</span>
              </div>
            </div>
            <div className="card">
              <h3 className="font-black mb-4">🛵 المندوبون النشطون</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">من {fmt(stats?.totalDrivers)}</span>
                <span className="text-3xl font-black text-success">{fmt(stats?.activeDrivers)}</span>
              </div>
            </div>
          </div>

          <div className="card card-accent mt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[var(--text-muted)] mb-1">إجمالي إيرادات المنصة</div>
                <div className="text-4xl font-black text-accent">
                  {fmt(stats?.totalRevenue)} <span className="text-lg">ر.ي</span>
                </div>
              </div>
              <div className="text-6xl">💎</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="card">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}<Link href="/notifications-setup" className="card card-accent flex items-center gap-3 mt-4">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <div className="font-black">إعدادات الإشعارات</div>
            <div className="text-xs text-[var(--text-muted)]">تفعيل الإشعارات الفورية</div>
          </div>
          <span className="text-accent">←</span>
        </Link>
      </div>
    </div>
  );
}
