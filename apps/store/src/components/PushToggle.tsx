'use client';

import { useEffect, useState } from 'react';
import { Fetcher, PushState, disablePush, enablePush, getPushState, plainFetch } from '@/lib/push';

const TEXT: Record<PushState, string> = {
  checking: 'جارٍ التحقق من حالة الإشعارات…',
  unsupported: 'متصفحك لا يدعم الإشعارات الفورية. على iPhone ثبّت التطبيق على الشاشة الرئيسية أولًا.',
  unavailable: 'الإشعارات الفورية غير مفعّلة على الخادم حاليًا.',
  denied: 'الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الموقع ثم أعد المحاولة.',
  off: 'فعّل الإشعارات لتصلك التنبيهات حتى والتطبيق مغلق.',
  on: 'الإشعارات الفورية مفعّلة على هذا الجهاز.',
};

export default function PushToggle({ fetcher = plainFetch }: { fetcher?: Fetcher }) {
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPushState(fetcher).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action: (f: Fetcher) => Promise<PushState>) => {
    setBusy(true);
    setError(null);
    try {
      setState(await action(fetcher));
    } catch {
      setError('تعذّر إكمال العملية، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const canToggle = state === 'off' || state === 'on' || state === 'unavailable';

  return (
    <div className="rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm">الإشعارات الفورية</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{error ?? TEXT[state]}</p>
        </div>
      </div>
      {canToggle && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(state === 'on' ? disablePush : enablePush)}
          className={`btn btn-sm btn-full mt-3 ${state === 'on' ? 'btn-ghost' : 'btn-primary'}`}
        >
          {busy ? 'لحظة…' : state === 'on' ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات'}
        </button>
      )}
    </div>
  );
}
