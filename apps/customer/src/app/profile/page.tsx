
'use client';

import { disablePush } from '@/lib/push';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  roles: string[];
}

const MENU_ITEMS = [
  { href: '/profile/account', icon: '👤', label: 'الحساب', desc: 'الاسم، البريد، الهاتف' },
  { href: '/orders', icon: '📦', label: 'طلباتي', desc: 'سجل الطلبات الحالية والسابقة' },
  { href: '/loyalty', icon: '🎁', label: 'نقاطي', desc: 'رصيد النقاط والمكافآت' },
  { href: '/referral', icon: '💌', label: 'ادعُ أصدقاءك', desc: 'اكسب 100 نقطة لكل صديق' },
  { href: '/notifications-setup', icon: '🔔', label: 'الإشعارات', desc: 'تفعيل الإشعارات الفورية' },
  { href: '/addresses', icon: '📍', label: 'العناوين', desc: 'عناوين التوصيل المحفوظة' },
  { href: '/notifications', icon: '🔔', label: 'الإشعارات', desc: 'آخر التحديثات والعروض' },
  { href: '/profile/change-password', icon: '🔐', label: 'تغيير كلمة المرور', desc: '' },
  { href: '/profile/change-city', icon: '🌍', label: 'تغيير المدينة', desc: 'مأرب' },
  { href: '/profile/support', icon: '📞', label: 'تواصل معنا', desc: '' },
  { href: '/profile/privacy', icon: '📄', label: 'سياسة الخصوصية', desc: '' },
  { href: '/profile/share', icon: '📤', label: 'مشاركة التطبيق', desc: '' },
  { href: '/profile/how-to-use', icon: '❓', label: 'كيفية استخدام التطبيق', desc: '' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/profile');
      return;
    }

    // First try cached user
    const cached = localStorage.getItem('user');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch {}
    }

    // Then fetch fresh
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    await disablePush();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('absher_cart');
    router.push('/');
  };

  if (loading && !user) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="حسابي" />
        <main className="container-app py-4 space-y-3">
          <div className="skeleton h-24 w-full rounded-2xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="حسابي" />

      <main className="container-app py-4 space-y-4">
        {/* ═══ User Card ═══ */}
        <section className="card animate-fade">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-red-dark)] flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || '؟'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg truncate">{user?.fullName || 'مستخدم'}</h2>
              <p className="text-xs text-[var(--text-muted)] truncate" dir="ltr">
                {user?.email || user?.phone || ''}
              </p>
              <div className="flex gap-1 mt-1.5">
                {(user?.roles || []).slice(0, 2).map((role) => (
                  <span key={role} className="badge badge-gold text-[10px]">
                    {role === 'customer' ? 'عميل' : role === 'driver' ? 'مندوب' : role === 'store_owner' ? 'صاحب متجر' : role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Location Banner ═══ */}
        <section className="card bg-gradient-to-br from-[var(--brand-red)]/10 to-transparent border-[var(--brand-red)]/20 animate-fade delay-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/20 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[var(--text-muted)] uppercase">المنطقة الحالية</p>
              <p className="font-black text-sm">🇾🇪 مأرب</p>
            </div>
            <Link href="/profile/change-city" className="text-xs text-[var(--brand-red-light)] font-bold">
              تغيير
            </Link>
          </div>
        </section>

        {/* ═══ Menu ═══ */}
        <section className="card p-0 overflow-hidden animate-fade delay-100">
          {MENU_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-4 hover:bg-[var(--bg-card-hover)] transition-colors ${
                i !== MENU_ITEMS.length - 1 ? 'border-b border-[var(--bg-border)]' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center flex-shrink-0 text-lg">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{item.label}</p>
                {item.desc && (
                  <p className="text-xs text-[var(--text-muted)] truncate">{item.desc}</p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ))}
        </section>

        {/* ═══ Logout ═══ */}
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-full text-[var(--danger)] border-[var(--danger)]/30 animate-fade delay-150"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          تسجيل الخروج
        </button>

        {/* Version */}
        <p className="text-center text-xs text-[var(--text-muted)] py-4">
          ABSHER BI — الإصدار 0.1.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
