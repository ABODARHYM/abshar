'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, clearSession } from '@/lib/auth';
import { disablePush } from '@/lib/push';

interface DriverProfile {
  userId?: string;
  id?: string;
  availability: 'offline' | 'online' | 'busy';
  status: string;
  ratingAvg?: number;
  rating?: number;
  ratingCount?: number;
  totalDeliveries?: number;
  todayEarnings?: number;
  cashOwed?: number;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    const cached = localStorage.getItem('user');
    if (cached) { try { setUser(JSON.parse(cached)); } catch {} }

    loadProfile();
  }, [router]);

  // 🆕 إعادة تحميل عند إشعار WebSocket
  useEffect(() => {
    const handler = () => {
      // نستخدم reload بسيط لتحديث بيانات الصفحة
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);


  const loadProfile = async () => {
    try {
      const res = await authFetch('/api/v1/driver/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {}
    setLoading(false);
  };

  const toggleAvailability = async () => {
    if (!profile || toggling) return;
    setToggling(true);

    const isOnline = profile.availability === 'online';
    const newAvailability = isOnline ? 'offline' : 'online';

    try {
      const res = await authFetch('/api/v1/driver/availability', {
        method: 'PATCH',
        body: JSON.stringify({ availability: newAvailability }),
      });

      if (res.ok) {
        await loadProfile();
      } else {
        const data = await res.json();
        alert(data.message || 'فشل التحديث');
      }
    } catch {}
    setToggling(false);
  };

  const logout = async () => {
    if (!confirm('تسجيل الخروج؟')) return;
    await disablePush(authFetch);
    clearSession();
    router.push('/login');
  };

  const isOnline = profile?.availability === 'online';

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center">
                <span className="text-xl">🛵</span>
              </div>
              <div>
                <div className="font-black text-sm">تطبيق المندوب</div>
                <div className="text-[10px] text-[var(--text-muted)]">{user?.fullName || '...'}</div>
              </div>
            </div>
            <button onClick={logout} className="p-2 text-[var(--text-muted)] hover:text-red-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-5">
        {/* Availability toggle — BIG */}
        {profile && (
          <section className={`card p-6 ${isOnline ? 'bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/40' : 'bg-gradient-to-br from-gray-500/20 to-transparent border-gray-500/30'}`}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{isOnline ? '🟢' : '🔴'}</div>
              <h2 className="text-2xl font-black mb-1">
                {isOnline ? 'أنت متصل' : 'أنت غير متصل'}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {isOnline ? 'تستقبل طلبات جديدة الآن' : 'لن تستقبل طلبات'}
              </p>
            </div>

            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className="btn btn-lg btn-full text-white font-black"
              style={{
                background: isOnline
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'linear-gradient(135deg, #10b981, #047857)',
              }}
            >
              {toggling ? '⏳...' : isOnline ? '⏸️ إيقاف التوفر' : '▶️ بدء العمل'}
            </button>
          </section>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="card bg-gradient-to-br from-amber-500/20 to-transparent border-amber-500/30">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-2xl font-black mb-1">{Number(profile?.ratingAvg ?? profile?.rating ?? 5).toFixed(1)}</div>
            <div className="text-xs text-[var(--text-muted)]">تقييمي</div>
          </div>
          <div className="card bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-2xl font-black mb-1">{profile?.totalDeliveries ?? 0}</div>
            <div className="text-xs text-[var(--text-muted)]">إجمالي التوصيلات</div>
          </div>
          <div className="card bg-gradient-to-br from-emerald-500/20 to-transparent border-emerald-500/30">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-black mb-1">{(profile?.todayEarnings ?? 0).toLocaleString()}</div>
            <div className="text-xs text-[var(--text-muted)]">أرباح اليوم (ر.ي)</div>
          </div>
          <div className="card bg-gradient-to-br from-red-500/20 to-transparent border-red-500/30">
            <div className="text-2xl mb-1">💵</div>
            <div className="text-2xl font-black mb-1">{(profile?.cashOwed ?? 0).toLocaleString()}</div>
            <div className="text-xs text-[var(--text-muted)]">عهدة نقدية</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="font-black text-base mb-3">⚡ إجراءات</h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction href="/available" icon="📋" label="الطلبات المتاحة" color="emerald" />
            <QuickAction href="/active" icon="🛵" label="طلبي الحالي" color="blue" />
            <QuickAction href="/earnings" icon="💰" label="أرباحي" color="amber" />
            <QuickAction href="/cash" icon="💵" label="العهدة النقدية" color="purple" />
          </div>
        </section>

        {/* Map preview */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black">📍 موقعي</h3>
            <span className="text-xs text-emerald-400 font-bold">
              {isOnline ? 'يتتبع تلقائياً' : 'متوقف'}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--bg-elevated)] py-8 text-center">
            <p className="text-3xl mb-2">🗺️</p>
            <p className="text-xs text-[var(--text-muted)]">
              سيتم عرض الخريطة هنا
            </p>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item active">
            <span className="text-xl">🏠</span>
            <span>الرئيسية</span>
          </Link>
          <Link href="/available" className="bottom-nav-item">
            <span className="text-xl">📋</span>
            <span>المتاحة</span>
          </Link>
          <Link href="/earnings" className="bottom-nav-item">
            <span className="text-xl">💰</span>
            <span>أرباحي</span>
          </Link>
          <Link href="/profile" className="bottom-nav-item">
            <span className="text-xl">👤</span>
            <span>حسابي</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function QuickAction({ href, icon, label, color }: any) {
  const colors: any = {
    emerald: 'from-emerald-500 to-green-700',
    blue: 'from-blue-500 to-blue-700',
    amber: 'from-amber-500 to-amber-700',
    purple: 'from-purple-500 to-purple-700',
  };
  return (
    <Link href={href}>
      <div className="card flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <span className="font-bold text-sm flex-1">{label}</span>
      </div>
    </Link>
  );
}
