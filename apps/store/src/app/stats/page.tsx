'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

interface StatsData {
  totalOrders?: number;
  pendingOrders?: number;
  acceptedOrders?: number;
  preparingOrders?: number;
  readyOrders?: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  totalProducts?: number;
  availableProducts?: number;
  totalRevenue?: number;
  revenueByCurrency?: Array<{ currency: string; totalRevenue: number; deliveredOrders: number }>;
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    authFetch('/api/v1/store-owner/stats')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const fmt = (v?: number) => Number(v || 0).toLocaleString('en-US');
  const currencyNames: Record<string, string> = { YER: 'ر.ي', SAR: 'ر.س', USD: 'دولار أمريكي' };
  const currencyLabel = (currency: string) => currencyNames[currency] || currency;

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-black">📈 التقارير</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <section>
              <h3 className="font-black text-base mb-3">📊 نظرة عامة</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBox icon="📦" label="إجمالي الطلبات" value={fmt(stats.totalOrders)} color="blue" />
                {stats.revenueByCurrency?.length ? (
                  stats.revenueByCurrency.map((item) => (
                    <StatBox
                      key={item.currency}
                      icon="💰"
                      label={`قيمة الطلبات المسلّمة — ${currencyLabel(item.currency)}`}
                      value={`${fmt(item.totalRevenue)} ${currencyLabel(item.currency)}`}
                      color="emerald"
                    />
                  ))
                ) : (
                  <StatBox icon="💰" label="قيمة الطلبات المسلّمة" value="0" color="emerald" />
                )}
              </div>
            </section>

            <section>
              <h3 className="font-black text-base mb-3">📦 تفاصيل الطلبات</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBox icon="🔴" label="جديدة" value={fmt(stats.pendingOrders)} color="red" />
                <StatBox icon="👨‍🍳" label="قيد التحضير" value={fmt((stats.acceptedOrders || 0) + (stats.preparingOrders || 0))} color="amber" />
                <StatBox icon="✅" label="جاهزة" value={fmt(stats.readyOrders)} color="emerald" />
                <StatBox icon="🎉" label="تم التسليم" value={fmt(stats.deliveredOrders)} color="purple" />
                <StatBox icon="❌" label="ملغاة" value={fmt(stats.cancelledOrders)} color="red" />
                {stats.revenueByCurrency?.map((item) => (
                  <StatBox
                    key={`average-${item.currency}`}
                    icon="💵"
                    label={`متوسط الطلب المسلّم — ${currencyLabel(item.currency)}`}
                    value={`${fmt(item.deliveredOrders ? item.totalRevenue / item.deliveredOrders : 0)} ${currencyLabel(item.currency)}`}
                    color="gold"
                  />
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-black text-base mb-3">🍔 المنتجات</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBox icon="📋" label="إجمالي المنتجات" value={fmt(stats.totalProducts)} color="amber" />
                <StatBox icon="✅" label="متوفرة" value={fmt(stats.availableProducts)} color="emerald" />
              </div>
            </section>
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/orders" className="bottom-nav-item"><span className="text-xl">📥</span><span>الطلبات</span></Link>
          <Link href="/products" className="bottom-nav-item"><span className="text-xl">🍔</span><span>المنتجات</span></Link>
          <Link href="/settings" className="bottom-nav-item"><span className="text-xl">⚙️</span><span>الإعدادات</span></Link>
        </div>
      </nav>
    </div>
  );
}

function StatBox({ icon, label, value, color }: any) {
  const colors: any = {
    blue: 'from-blue-500/20 to-transparent border-blue-500/30',
    emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30',
    purple: 'from-purple-500/20 to-transparent border-purple-500/30',
    amber: 'from-amber-500/20 to-transparent border-amber-500/30',
    red: 'from-red-500/20 to-transparent border-red-500/30',
    gold: 'from-yellow-500/20 to-transparent border-yellow-500/30',
  };
  return (
    <div className={`card bg-gradient-to-br ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black mb-1">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
