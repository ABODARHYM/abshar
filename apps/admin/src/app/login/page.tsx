'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      const roles = data.user?.roles || [];
      const allowedRoles = ['admin', 'superAdmin', 'super_admin', 'support', 'finance'];
      const isAdmin = roles.some((r: string) => allowedRoles.includes(r));

      if (!isAdmin) {
        setError('هذا الحساب ليس لديه صلاحيات إدارية');
        setLoading(false);
        return;
      }

      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/');
    } catch (err) {
      setError('خطأ في الاتصال: ' + (err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-fuchsia-400 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative w-full max-w-md animate-fade">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30">
            <span className="text-4xl">⚙️</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">لوحة الإدارة</h1>
          <p className="text-sm text-[var(--text-muted)]">
            ABSHER BI — إدارة المنصة
          </p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">البريد أو الهاتف</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@absher.bi"
                required
                className="input"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-lg btn-full text-white font-black"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
            >
              {loading ? '⏳ جاري الدخول...' : '🔑 دخول الإدارة'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          ABSHER BI © 2026 — لوحة الإدارة
        </p>
      </div>
    </div>
  );
}
