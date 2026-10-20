'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

export default function StoreDashboard() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const cached = localStorage.getItem('user');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }

    authFetch('/api/v1/store-owner/my-store')
      .then(async (r) => {
        console.log('[Dashboard] my-store status:', r.status);
        if (r.ok) {
          const data = await r.json();
          console.log('[Dashboard] Store loaded:', data.nameAr);
          return data;
        }
        if (r.status === 401) {
          console.log('[Dashboard] 401 - redirecting to login');
          router.push('/login');
          return null;
        }
        const errData = await r.json().catch(() => ({}));
        setError(`${r.status}: ${errData.message || r.statusText}`);
        return null;
      })
      .then(setStore)
      .catch((e) => {
        console.error('[Dashboard] Error:', e);
        setError('فشل الاتصال: ' + e.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    if (!confirm('تسجيل الخروج؟')) return;
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-6 space-y-4">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <p className="text-center text-sm text-muted">جاري التحميل...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-6">
        <div className="card border-r-4 border-r-red-500">
          <h2 className="font-black text-red-400 mb-2">⚠️ خطأ</h2>
          <p className="text-sm mb-4 font-mono" dir="ltr">{error}</p>
          <div className="flex gap-2">
            <button onClick={() => location.reload()} className="btn btn-primary btn-sm flex-1">🔄 إعادة المحاولة</button>
            <button onClick={logout} className="btn btn-ghost btn-sm flex-1">🚪 خروج</button>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-6">
        <div className="card text-center py-16">
          <p className="text-6xl mb-4">🏪</p>
          <h2 className="font-black text-lg mb-2">لا يوجد متجر</h2>
          <p className="text-sm text-muted mb-4">هذا الحساب غير مرتبط بمتجر</p>
          <button onClick={logout} className="btn btn-primary">🚪 خروج</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
                  <path d="M3 9l2-6h14l2 6" />
                </svg>
              </div>
              <div>
                <div className="font-black text-sm">{store.nameAr}</div>
                <div className="text-[10px] text-muted">{user?.fullName || 'صاحب المتجر'}</div>
              </div>
            </div>
            <button onClick={logout} className="p-2 text-muted hover:text-red-400">
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
        {/* Store Status */}
        <section className={`card ${store.isOpen ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30' : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${store.isOpen ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center text-2xl`}>
              {store.isOpen ? '🟢' : '🔴'}
            </div>
            <div className="flex-1">
              <h3 className="font-black">{store.isOpen ? 'المتجر مفتوح' : 'المتجر مغلق'}</h3>
              <p className="text-xs text-muted">{store.isOpen ? 'يستقبل طلبات' : 'لا يستقبل طلبات'}</p>
            </div>
            <Link href="/settings" className="btn btn-ghost btn-sm">تغيير</Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="text-2xl mb-1">⭐</div>
            <div className="text-2xl font-black">{Number(store.ratingAvg || 0).toFixed(1)}</div>
            <div className="text-xs text-muted">التقييم ({store.ratingCount || 0})</div>
          </div>
          <div className="card">
            <div className="text-2xl mb-1">🚚</div>
            <div className="text-2xl font-black">{store.deliveryFee} <span className="text-xs">ر.ي</span></div>
            <div className="text-xs text-muted">رسوم التوصيل</div>
          </div>
          <div className="card">
            <div className="text-2xl mb-1">💵</div>
            <div className="text-2xl font-black">{store.minOrderAmount} <span className="text-xs">ر.ي</span></div>
            <div className="text-xs text-muted">الحد الأدنى</div>
          </div>
          <div className="card">
            <div className="text-2xl mb-1">⏱️</div>
            <div className="text-2xl font-black">{store.avgPrepMinutes} <span className="text-xs">د</span></div>
            <div className="text-xs text-muted">وقت التحضير</div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="font-black mb-3">⚡ إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/orders" className="card flex items-center gap-3 hover:border-blue-500">
              <span className="text-2xl">📥</span>
              <div>
                <div className="font-bold text-sm">الطلبات</div>
                <div className="text-[10px] text-muted">استقبال وإدارة</div>
              </div>
            </Link>
            <Link href="/products" className="card flex items-center gap-3 hover:border-blue-500">
              <span className="text-2xl">🍔</span>
              <div>
                <div className="font-bold text-sm">المنتجات</div>
                <div className="text-[10px] text-muted">قائمة الطعام</div>
              </div>
            </Link>
            <Link href="/stats" className="card flex items-center gap-3 hover:border-blue-500">
              <span className="text-2xl">📈</span>
              <div>
                <div className="font-bold text-sm">التقارير</div>
                <div className="text-[10px] text-muted">تحليلات</div>
              </div>
            </Link>
            <Link href="/settings" className="card flex items-center gap-3 hover:border-blue-500">
              <span className="text-2xl">⚙️</span>
              <div>
                <div className="font-bold text-sm">الإعدادات</div>
                <div className="text-[10px] text-muted">معلومات المتجر</div>
              </div>
            </Link>
          </div>
        </section>

        {/* Store Info */}
        <section className="card">
          <h3 className="font-black mb-3">📋 معلومات المتجر</h3>
          <div className="space-y-2 text-sm">
            {store.descriptionAr && (
              <div>
                <span className="text-muted text-xs">الوصف:</span>
                <p className="text-sm">{store.descriptionAr}</p>
              </div>
            )}
            {store.phone && (
              <div>
                <span className="text-muted text-xs">الهاتف:</span>
                <p className="text-sm font-mono" dir="ltr">{store.phone}</p>
              </div>
            )}
            {store.addressText && (
              <div>
                <span className="text-muted text-xs">العنوان:</span>
                <p className="text-sm">📍 {store.addressText}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item active"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/orders" className="bottom-nav-item"><span className="text-xl">📥</span><span>الطلبات</span></Link>
          <Link href="/products" className="bottom-nav-item"><span className="text-xl">🍔</span><span>المنتجات</span></Link>
          <Link href="/settings" className="bottom-nav-item"><span className="text-xl">⚙️</span><span>الإعدادات</span></Link>
        </div>
      </nav>
    </div>
  );
}
