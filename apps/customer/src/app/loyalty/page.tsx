
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

interface Balance {
  points: number;
  pendingPoints: number;
  pointValueCurrency: number;
  totalValue: number;
  currency: string;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

interface Reward {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  pointsCost: number;
  rewardType: string;
  rewardValue: number;
  imageUrl: string | null;
  isActive: boolean;
}

interface Tx {
  id: string;
  type: string;
  points: number;
  description: string | null;
  createdAt: string;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login?redirect=/loyalty'); return; }

    Promise.all([
      fetch('/api/v1/loyalty/my/balance', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
      fetch('/api/v1/loyalty/rewards', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      fetch('/api/v1/loyalty/my/transactions?limit=10', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : { items: [] }),
    ])
      .then(([bal, rw, tx]) => {
        setBalance(bal);
        setRewards(Array.isArray(rw) ? rw : []);
        setTransactions(tx.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const redeem = async (rewardId: string, pointsCost: number) => {
    if (!balance || balance.points < pointsCost) {
      setMessage({ type: 'err', text: `تحتاج ${pointsCost} نقطة. لديك ${balance?.points || 0}` });
      return;
    }
    if (!confirm(`استبدال ${pointsCost} نقطة؟`)) return;

    setRedeeming(rewardId);
    setMessage(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.message || 'فشل الاستبدال' });
        return;
      }

      setMessage({ type: 'ok', text: `✅ تم! المتبقي: ${data.remainingPoints} نقطة` });
      load();
    } catch {
      setMessage({ type: 'err', text: 'خطأ في الاتصال' });
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="نقاطي" />
        <main className="container-app py-4 space-y-3">
          <div className="skeleton h-40 rounded-2xl" />
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="نقاطي" />

      <main className="container-app py-4 space-y-4">
        {/* ═══ Balance Card ═══ */}
        <section className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-red-dark)] animate-fade">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white/80">رصيد النقاط</span>
              <span className="text-xl">🎁</span>
            </div>
            <div className="text-5xl font-black text-white mb-2">
              {balance?.points ?? 0}
            </div>
            <p className="text-sm text-white/80">
              ≈ {balance?.totalValue?.toFixed(0) ?? 0} {balance?.currency ?? 'ر.ي'} قيمة نقدية
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70 mb-1">مجموع المكتسب</p>
                <p className="font-black text-white">{balance?.lifetimeEarned ?? 0} نقطة</p>
              </div>
              <div>
                <p className="text-xs text-white/70 mb-1">مجموع المستبدل</p>
                <p className="font-black text-white">{balance?.lifetimeRedeemed ?? 0} نقطة</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Message ═══ */}
        {message && (
          <div className={`card border-r-4 animate-slide-down ${
            message.type === 'ok' ? 'border-r-[var(--success)]' : 'border-r-[var(--danger)]'
          }`}>
            <p className={`text-sm font-bold ${
              message.type === 'ok' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* ═══ Rewards ═══ */}
        <section className="animate-fade delay-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-base">🎁 المكافآت المتاحة</h3>
            <span className="text-xs text-[var(--text-muted)]">{rewards.length} مكافأة</span>
          </div>

          {rewards.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">🎁</div>
              <p className="text-sm text-[var(--text-muted)]">لا توجد مكافآت متاحة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((r, i) => {
                const canRedeem = (balance?.points ?? 0) >= r.pointsCost;
                return (
                  <div
                    key={r.id}
                    className="card animate-fade flex gap-3 items-center"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="w-16 h-16 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-3xl flex-shrink-0">
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt={r.nameAr} className="w-full h-full object-cover rounded-xl" />
                      ) : '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{r.nameAr}</h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        {r.pointsCost} نقطة • {r.rewardValue} {r.rewardType === 'discount_percent' ? '%' : 'ر.ي'}
                      </p>
                    </div>
                    <button
                      onClick={() => redeem(r.id, r.pointsCost)}
                      disabled={!canRedeem || redeeming === r.id}
                      className={`btn btn-sm ${canRedeem ? 'btn-primary' : 'btn-ghost opacity-50'}`}
                    >
                      {redeeming === r.id ? '...' : canRedeem ? 'استبدال' : 'غير كافٍ'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ Transactions ═══ */}
        <section className="animate-fade delay-200">
          <h3 className="font-black text-base mb-3">📜 آخر العمليات</h3>

          {transactions.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">لا توجد عمليات بعد</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {transactions.map((tx, i) => {
                const positive = tx.points > 0;
                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 p-4 ${
                      i !== transactions.length - 1 ? 'border-b border-[var(--bg-border)]' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                      positive ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                    }`}>
                      {positive ? '+' : '−'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(tx.createdAt).toLocaleDateString('ar-YE')}
                      </p>
                    </div>
                    <span className={`font-black whitespace-nowrap ${
                      positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {positive ? '+' : ''}{tx.points}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
