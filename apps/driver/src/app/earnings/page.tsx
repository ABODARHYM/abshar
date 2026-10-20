'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

interface Earnings {
  today: number;
  week: number;
  month: number;
  total: number;
  todayDeliveries: number;
  weekDeliveries: number;
  monthDeliveries: number;
  totalDeliveries: number;
}

interface Delivery {
  id: string;
  orderNumber: string;
  earning: number;
  deliveredAt: string;
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [recent, setRecent] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch('/api/v1/driver/earnings').then((r) => r.ok ? r.json() : null),
      authFetch('/api/v1/driver/orders/my?status=delivered&limit=10').then((r) => r.ok ? r.json() : { items: [] }),
    ]).then(([earn, orders]) => {
      setEarnings(earn);
      setRecent(orders.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // 🆕 إعادة تحميل عند إشعار WebSocket
  useEffect(() => {
    const handler = () => {
      // نستخدم reload بسيط لتحديث بيانات الصفحة
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);


  const fmt = (v?: number) => Number(v || 0).toLocaleString('en-US');

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-4">
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

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
            <h1 className="font-black">💰 أرباحي</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {/* Total */}
        <div className="card bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/30">
          <p className="text-xs text-muted mb-1">إجمالي الأرباح</p>
          <p className="text-4xl font-black text-emerald-400 mb-2">{fmt(earnings?.total)} ر.ي</p>
          <p className="text-xs text-muted">من {fmt(earnings?.totalDeliveries)} توصيل</p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="card text-center p-3">
            <p className="text-xs text-muted mb-1">اليوم</p>
            <p className="text-lg font-black text-emerald-400">{fmt(earnings?.today)}</p>
            <p className="text-[10px] text-muted">{fmt(earnings?.todayDeliveries)} توصيل</p>
          </div>
          <div className="card text-center p-3">
            <p className="text-xs text-muted mb-1">الأسبوع</p>
            <p className="text-lg font-black text-blue-400">{fmt(earnings?.week)}</p>
            <p className="text-[10px] text-muted">{fmt(earnings?.weekDeliveries)} توصيل</p>
          </div>
          <div className="card text-center p-3">
            <p className="text-xs text-muted mb-1">الشهر</p>
            <p className="text-lg font-black text-amber-400">{fmt(earnings?.month)}</p>
            <p className="text-[10px] text-muted">{fmt(earnings?.monthDeliveries)} توصيل</p>
          </div>
        </div>

        {/* Recent */}
        <section>
          <h3 className="font-black mb-3">📋 آخر التوصيلات</h3>
          {recent.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm text-muted">لا توجد توصيلات بعد</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {recent.map((d, i) => (
                <div key={d.id} className={`p-3 flex justify-between ${i !== recent.length - 1 ? 'border-b border-[var(--bg-border)]' : ''}`}>
                  <div>
                    <p className="font-bold text-sm" dir="ltr">#{d.orderNumber}</p>
                    <p className="text-[10px] text-muted">{new Date(d.deliveredAt).toLocaleDateString('ar-YE')}</p>
                  </div>
                  <p className="font-black text-emerald-400">+{fmt(d.earning)} ر.ي</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/available" className="bottom-nav-item"><span className="text-xl">📋</span><span>المتاحة</span></Link>
          <Link href="/earnings" className="bottom-nav-item active"><span className="text-xl">💰</span><span>أرباحي</span></Link>
          <Link href="/profile" className="bottom-nav-item"><span className="text-xl">👤</span><span>حسابي</span></Link>
        </div>
      </nav>
    </div>
  );
}
