'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

interface CashSummary {
  owedAmount: number;
  collectedToday: number;
  submittedToday: number;
  totalCollected: number;
  totalSubmitted: number;
}

interface CashTx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export default function CashPage() {
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [txs, setTxs] = useState<CashTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sumRes, txRes] = await Promise.all([
        authFetch('/api/v1/driver-cash/my/summary'),
        authFetch('/api/v1/driver-cash/my/transactions?limit=20'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) {
        const d = await txRes.json();
        setTxs(d.items || []);
      }
    } catch {}
    setLoading(false);
  };

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      alert('أدخل مبلغاً صحيحاً');
      return;
    }
    if (!summary || Number(amount) > summary.owedAmount) {
      alert('المبلغ أكبر من العهدة');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/v1/driver-cash/my/submit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      });

      if (res.ok) {
        alert('✅ تم تسليم المبلغ');
        setAmount('');
        await loadData();
      } else {
        const data = await res.json();
        alert(data.message || 'فشل');
      }
    } catch {
      alert('خطأ');
    }
    setSubmitting(false);
  };

  const fmt = (v?: number) => Number(v || 0).toLocaleString('en-US');

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-4">
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-black">💵 العهدة النقدية</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {/* Owed */}
        <div className={`card ${summary && summary.owedAmount > 0 ? 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30' : 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30'}`}>
          <p className="text-xs text-muted mb-1">المطلوب تسليمه</p>
          <p className={`text-4xl font-black ${summary && summary.owedAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmt(summary?.owedAmount)} ر.ي
          </p>
          {summary?.owedAmount === 0 && (
            <p className="text-xs text-emerald-400 mt-2">✅ لا توجد عهدة مستحقة</p>
          )}
        </div>

        {/* Submit */}
        {summary && summary.owedAmount > 0 && (
          <div className="card">
            <h3 className="font-black text-sm mb-3">💸 تسليم نقد</h3>
            <div className="space-y-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`حتى ${summary.owedAmount} ر.ي`}
                className="input"
                dir="ltr"
              />
              <div className="flex gap-2">
                <button onClick={() => setAmount(String(summary.owedAmount))} className="btn btn-ghost btn-sm flex-1">
                  الكل
                </button>
                <button onClick={submit} disabled={submitting || !amount} className="btn btn-primary flex-1">
                  {submitting ? '...' : 'تسليم'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs text-muted">مُحصّل اليوم</p>
            <p className="text-xl font-black">{fmt(summary?.collectedToday)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-muted">مُسلّم اليوم</p>
            <p className="text-xl font-black">{fmt(summary?.submittedToday)}</p>
          </div>
        </div>

        {/* Recent */}
        <section>
          <h3 className="font-black mb-3">📋 آخر العمليات</h3>
          {txs.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-muted">لا توجد عمليات</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {txs.map((tx, i) => (
                <div key={tx.id} className={`p-3 flex justify-between ${i !== txs.length - 1 ? 'border-b border-[var(--bg-border)]' : ''}`}>
                  <div>
                    <p className="text-sm font-bold">
                      {tx.type === 'collect' ? '💵 استلام من عميل' : tx.type === 'submit' ? '✅ تسليم للإدارة' : tx.type}
                    </p>
                    <p className="text-[10px] text-muted">{new Date(tx.createdAt).toLocaleString('ar-YE')}</p>
                  </div>
                  <p className={`font-black ${tx.type === 'collect' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {tx.type === 'collect' ? '+' : '-'}{fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/available" className="bottom-nav-item"><span className="text-xl">📋</span><span>المتاحة</span></Link>
          <Link href="/cash" className="bottom-nav-item active"><span className="text-xl">💵</span><span>العهدة</span></Link>
          <Link href="/profile" className="bottom-nav-item"><span className="text-xl">👤</span><span>حسابي</span></Link>
        </div>
      </nav>
    </div>
  );
}
