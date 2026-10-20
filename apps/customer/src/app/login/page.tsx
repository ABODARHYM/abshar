
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
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
        return;
      }

      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/');
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Decorations */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-emerald-400 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-amber-400 rounded-full blur-3xl animate-float delay-500"></div>
      </div>

      <div className="relative w-full max-w-md animate-fadeInUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-lg border border-white/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-right text-white">
              <div className="font-black text-2xl">ABSHER BI</div>
              <div className="text-xs text-emerald-300">أبشر بي</div>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">مرحباً بك من جديد</h1>
          <p className="text-emerald-100/80 text-sm">سجّل دخولك للمتابعة</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/40">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold animate-slideDown">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                البريد الإلكتروني أو الهاتف
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@email.com"
                required
                className="input"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                كلمة المرور
              </label>
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
              className="btn btn-primary w-full btn-lg"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري الدخول...
                </>
              ) : (
                <>🔑 تسجيل الدخول</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
                سجّل الآن
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          ABSHER BI © 2026 — من مأرب... إلى كل اليمن
        </p>
      </div>
    </div>
  );
}
