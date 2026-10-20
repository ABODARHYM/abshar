'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error('[Store Detail]', error); }, [error]);

  return (
    <div style={{ padding: '24px' }}>
      <div className="card border-r-4 border-r-red-500">
        <h2 className="font-black text-red-400 mb-2">⚠️ خطأ</h2>
        <p className="text-sm mb-4">{error.message}</p>
        <details className="text-xs mb-4">
          <summary className="cursor-pointer text-muted">تفاصيل تقنية</summary>
          <pre className="bg-[var(--bg-elevated)] p-3 rounded text-[10px] overflow-auto max-h-40 mt-2" dir="ltr">
            {error.stack}
          </pre>
        </details>
        <div className="flex gap-2">
          <button onClick={reset} className="btn btn-primary btn-sm flex-1">🔄 إعادة</button>
          <Link href="/stores" className="btn btn-ghost btn-sm flex-1">← المتاجر</Link>
        </div>
      </div>
    </div>
  );
}
