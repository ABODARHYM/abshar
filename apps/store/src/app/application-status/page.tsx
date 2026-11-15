'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ApplicationStatusPage() {
  const [id, setId] = useState('');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const applicationId = params.get('id') || '';
    setId(applicationId);

    // الرمز لا ينتقل عبر عنوان الصفحة أو سجل المتصفح
    const savedToken = applicationId
      ? sessionStorage.getItem(`storeApplicationTracking:${applicationId}`) || ''
      : '';
    setToken(savedToken);
  }, []);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const r = await fetch(
        `/api/v1/store-applications/${encodeURIComponent(id)}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingToken: token }),
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذر العثور على الطلب');
      setResult(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const status = result?.status;
  const statusText =
    status === 'pending' ? 'قيد مراجعة الإدارة' :
    status === 'approved' ? 'تمت الموافقة على الطلب' :
    status === 'rejected' ? 'تم رفض الطلب' : status;

  return (
    <main dir="rtl" className="min-h-screen p-5 flex items-center justify-center"
      style={{ background: 'var(--gradient-hero)' }}>
      <div className="card w-full max-w-lg space-y-5">
        <div className="text-center">
          <div className="text-5xl mb-3">🔎</div>
          <h1 className="text-2xl font-black">متابعة طلب المتجر</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            أدخل رقم الطلب ورمز المتابعة الخاص بك
          </p>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

        <form onSubmit={check} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-bold mb-2">رقم الطلب</span>
            <input className="input" dir="ltr" required value={id}
              onChange={(e) => setId(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm font-bold mb-2">رمز المتابعة</span>
            <input className="input" dir="ltr" required value={token}
              onChange={(e) => setToken(e.target.value)} />
          </label>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? '⏳ جارٍ التحقق...' : 'التحقق من حالة الطلب'}
          </button>
        </form>

        {result && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--bg-elevated)' }}>
            <div className="font-black text-lg">{result.store_name_ar}</div>
            <div className={`font-black ${
              status === 'approved' ? 'text-green-500' :
              status === 'rejected' ? 'text-red-400' : 'text-amber-500'
            }`}>
              {statusText}
            </div>
            {result.review_note && (
              <div className="text-sm">
                <div className="font-bold">ملاحظة الإدارة:</div>
                <p>{result.review_note}</p>
              </div>
            )}
            {status === 'approved' && (
              <p className="text-sm text-green-500">
                يمكنك الآن تسجيل الدخول إلى لوحة المتجر. وقد يبقى المتجر بانتظار تفعيله من الإدارة.
              </p>
            )}
            <div className="text-xs text-[var(--text-muted)]">
              تاريخ التقديم: {new Date(result.created_at).toLocaleString('ar')}
            </div>
          </div>
        )}

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-400">العودة إلى تسجيل الدخول</Link>
        </div>
      </div>
    </main>
  );
}
