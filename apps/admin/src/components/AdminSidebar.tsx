'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MENU = [
  { href: '/', label: 'لوحة التحكم', icon: '📊' },
  { href: '/users', label: 'المستخدمون', icon: '👥' },
  { href: '/stores', label: 'المتاجر', icon: '🏪' },
  { href: '/drivers', label: 'المندوبون', icon: '🛵' },
  { href: '/orders', label: 'الطلبات', icon: '📦' },
  { href: '/coupons', label: 'الكوبونات', icon: '🎫' },
  { href: '/settlements', label: 'التسويات المالية', icon: '💰' },
  { href: '/reports', label: 'التقارير', icon: '📈' },
  { href: '/audit', label: 'Audit Logs', icon: '📝' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);

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
  }, [router]);

  // أغلق sidebar عند تغيير الصفحة (على الجوال)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const logout = () => {
    if (!confirm('تسجيل الخروج؟')) return;
    localStorage.clear();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 right-4 z-50 p-3 rounded-xl bg-accent text-white shadow-lg"
        style={{ background: 'var(--accent)' }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
        />
      )}

      <aside
        className={`admin-sidebar ${open ? 'open' : ''}`}
        style={{
          transform: open ? 'translateX(0)' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xl shadow-lg">
              ⚙️
            </div>
            <div>
              <div className="font-black text-base">ABSHER BI</div>
              <div className="text-[10px] text-accent">لوحة الإدارة</div>
            </div>
          </div>
        </div>

        {/* User */}
        {user && (
          <div style={{ padding: '16px', borderBottom: '1px solid var(--bg-border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-black text-accent">
                {user.fullName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{user.fullName}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate" dir="ltr">
                  {user.email || user.phone}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        <nav style={{ padding: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {MENU.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-1 ${
                  active
                    ? 'bg-accent/20 text-accent border-r-4'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white'
                }`}
                style={{
                  borderRightColor: active ? 'var(--accent)' : undefined,
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px',
            borderTop: '1px solid var(--bg-border)',
            background: 'var(--bg-card)',
          }}
        >
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
