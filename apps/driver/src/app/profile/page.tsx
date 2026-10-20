'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, clearSession } from '@/lib/auth';
import { disablePush } from '@/lib/push';
import PushToggle from '@/components/PushToggle';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    authFetch('/api/v1/driver/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    if (!confirm('تسجيل الخروج؟')) return;
    await disablePush(authFetch);
    clearSession();
    router.push('/login');
  };

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <h1 className="font-black">👤 حسابي</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>
      <main className="container-app py-4 space-y-4">
        <PushToggle fetcher={authFetch} />
        {loading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : (
          <>
            <section className="card text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center mx-auto mb-3 text-3xl">
                🛵
              </div>
              <h2 className="font-black text-lg">معلومات المندوب</h2>
              {profile && (
                <div className="mt-4 space-y-2 text-sm">
                  <p>⭐ التقييم: <strong>{profile.rating?.toFixed(1)}</strong></p>
                  <p>📦 التوصيلات: <strong>{profile.totalDeliveries}</strong></p>
                </div>
              )}
            </section>

            <Link href="/notifications-setup" className="card flex items-center gap-3 mb-3">
              <span className="text-xl">🔔</span>
              <div className="flex-1">
                <div className="font-bold text-sm">الإشعارات</div>
                <div className="text-xs text-[var(--text-muted)]">تفعيل الإشعارات الفورية</div>
              </div>
              <span className="text-accent">←</span>
            </Link>

            <button onClick={logout} className="btn btn-ghost btn-full text-red-400 border-red-500/30">
              🚪 تسجيل الخروج
            </button>
          </>
        )}
      </main>
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/available" className="bottom-nav-item"><span className="text-xl">📋</span><span>المتاحة</span></Link>
          <Link href="/earnings" className="bottom-nav-item"><span className="text-xl">💰</span><span>أرباحي</span></Link>
          <Link href="/profile" className="bottom-nav-item active"><span className="text-xl">👤</span><span>حسابي</span></Link>
        </div>
      </nav>
    </div>
  );
}
