'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Order page error:', error);
  }, [error]);

  return (
    <div className="app-shell bg-[var(--bg-base)] p-6 min-h-screen">
      <div className="card border-r-4 border-r-red-500">
        <h2 className="font-black text-red-400 mb-2">⚠️ خطأ في الصفحة</h2>
        <p className="text-sm mb-3">{error.message}</p>
        <details className="text-xs">
          <summary className="cursor-pointer text-[var(--text-muted)] mb-2">
            تفاصيل تقنية
          </summary>
          <pre className="bg-[var(--bg-elevated)] p-3 rounded text-[10px] whitespace-pre-wrap break-all" dir="ltr">
            {error.stack}
          </pre>
        </details>
        <div className="flex gap-2 mt-4">
          <button onClick={reset} className="btn btn-primary btn-sm">
            إعادة المحاولة
          </button>
          <a href="/orders" className="btn btn-ghost btn-sm">
            قائمة الطلبات
          </a>
        </div>
      </div>
    </div>
  );
}
