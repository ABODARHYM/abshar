'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (input: string): string => {
    let cleaned = input.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+967')) return cleaned;
    if (cleaned.startsWith('967')) return '+' + cleaned;
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (/^7\d{8}$/.test(cleaned)) return '+967' + cleaned;
    return '+' + cleaned;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: normalizePhone(phone),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      const roles = data.user?.roles || [];
      const isStoreOwner = roles.includes('storeOwner') || roles.includes('admin') || roles.includes('super_admin');

      if (!isStoreOwner) {
        setError('هذا الحساب ليس حساب صاحب متجر');
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
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-emerald-400 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative w-full max-w-md animate-fade">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l2-6h14l2 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">لوحة المتجر</h1>
          <p className="text-sm text-[var(--text-muted)]">ABSHER BI — لوحة صاحب المتجر</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">رقم الهاتف</label>
              <div className="relative" dir="ltr">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm font-bold text-blue-400 border-r border-[var(--bg-border)] pr-3">
                    🇾🇪 +967
                  </span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s]/g, ''))}
                  placeholder="777 123 456"
                  required
                  className="input pl-24 text-left font-bold tracking-wider"
                  dir="ltr"
                />
              </div>
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
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              {loading ? '⏳ جاري الدخول...' : '🔑 تسجيل الدخول'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          ABSHER BI © 2026 — لوحة صاحب المتجر
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginContent />
    </Suspense>
  );
}
