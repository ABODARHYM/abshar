'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  fullName?: string;
  full_name?: string;
  email?: string;
  roles?: string[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.replace('/login');
          return;
        }

        const data = await res.json();
        const current = data.user || data;
        const saved = JSON.parse(localStorage.getItem('user') || '{}');
        const roles = current.roles || saved.roles || [];

        if (!roles.includes('admin') && !roles.includes('superAdmin')) {
          if (active) {
            setError('هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.');
            setLoading(false);
          }
          return;
        }

        if (active) {
          setUser(current);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError('تعذر الاتصال بالخادم. تأكد من تشغيل Backend.');
          setLoading(false);
        }
      }
    }

    verifyAdmin();
    return () => { active = false; };
  }, [router]);

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.replace('/login');
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-bold">جارٍ التحقق من صلاحيات المدير...</p>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main dir="rtl" className="min-h-screen flex items-center justify-center p-6">
        <section className="max-w-md w-full rounded-2xl border p-6 shadow-lg">
          <h1 className="text-2xl font-black mb-4">لوحة إدارة أبشر بي</h1>
          <p className="mb-5">{error || 'تعذر التحقق من صلاحيات الحساب.'}</p>
          <button
            className="btn btn-primary w-full"
            onClick={() => router.replace('/login')}
          >
            تسجيل الدخول بحساب المدير
          </button>
        </section>
      </main>
    );
  }

  const name = user.fullName || user.full_name || user.email || 'المدير';

  const sections = [
    { icon: '👥', title: 'إدارة المستخدمين', desc: 'متابعة حسابات المستخدمين وصلاحياتهم' },
    { icon: '🏪', title: 'إدارة المتاجر', desc: 'متابعة المتاجر وحالات اعتمادها' },
    { icon: '🛵', title: 'إدارة المندوبين', desc: 'متابعة المندوبين وحالات حساباتهم' },
    { icon: '📦', title: 'إدارة الطلبات', desc: 'متابعة الطلبات وحالات التوصيل' },
    { icon: '💰', title: 'المالية والتقارير', desc: 'قسم مخصص للعمليات المالية والتقارير' },
    { icon: '⚙️', title: 'إعدادات النظام', desc: 'إعدادات المنصة والصلاحيات' },
  ];

  return (
    <main dir="rtl" className="min-h-screen p-4 md:p-8"
      style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm opacity-70">ABSHER BI</p>
            <h1 className="text-3xl font-black mt-1">لوحة الإدارة</h1>
            <p className="mt-2 opacity-80">مرحبًا، {name}</p>
          </div>
          <button className="btn btn-primary" onClick={logout}>
            تسجيل الخروج
          </button>
        </header>

        <section className="rounded-2xl border p-5 mb-8"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#0f172a' }}>
          <h2 className="text-xl font-black mb-2">مرحبًا بك في لوحة التحكم</h2>
          <p className="text-sm">
            تم التحقق من صلاحية حساب الإدارة. هذه الواجهة الأساسية،
            وتحتاج الأقسام إلى ربطها بواجهات الإدارة الفعلية في الخادم.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((item) => (
            <article key={item.title}
              className="rounded-2xl border p-5 shadow-sm"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#0f172a' }}>
              <div className="text-3xl mb-4">{item.icon}</div>
              <h2 className="text-lg font-black mb-2">{item.title}</h2>
              <p className="text-sm opacity-75">{item.desc}</p>
              <p className="text-xs mt-4 text-amber-700">
                يحتاج ربط وظائف القسم
              </p>
            </article>
          ))}
        </section>

        <footer className="text-center text-sm opacity-70 mt-10">
          ABSHER BI © 2026
        </footer>
      </div>
    </main>
  );
}
