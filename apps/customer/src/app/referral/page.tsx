
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

interface ReferralCode {
  referralCode: string;
  shareUrl: string;
  rewardOnSignup: number;
  rewardOnFirstOrder: number;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  rewarded: number;
  totalPointsEarned: number;
}

interface Invite {
  id: string;
  code: string;
  status: string;
  rewardPoints: number;
  referredName: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'بانتظار', color: 'text-amber-400', icon: '⏳' },
  completed: { label: 'مكتمل', color: 'text-blue-400', icon: '✅' },
  rewarded: { label: 'تم الصرف', color: 'text-emerald-400', icon: '🎉' },
  expired: { label: 'منتهي', color: 'text-red-400', icon: '⏰' },
  cancelled: { label: 'ملغي', color: 'text-red-400', icon: '❌' },
};

export default function ReferralPage() {
  const router = useRouter();
  const [codeData, setCodeData] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login?redirect=/referral'); return; }

    Promise.all([
      fetch('/api/v1/referral/my/code', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
      fetch('/api/v1/referral/my/stats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
      fetch('/api/v1/referral/my/invites', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : { items: [] }),
    ])
      .then(([c, s, inv]) => {
        setCodeData(c);
        setStats(s);
        setInvites(inv.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = async () => {
    if (!codeData) return;
    try {
      await navigator.clipboard.writeText(codeData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('input');
      el.value = codeData.referralCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const share = async () => {
    if (!codeData) return;
    const text = `انضم إلى ABSHER BI — منصة التوصيل اليمنية!
استخدم كود الإحالة: ${codeData.referralCode}
واحصل على ${codeData.rewardOnSignup} نقطة هدية 🎁
${codeData.shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'ABSHER BI', text, url: codeData.shareUrl });
        return;
      } catch {}
    }
    // Fallback: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="الإحالات" />
        <main className="container-app py-4 space-y-3">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="ادعُ أصدقاءك" />

      <main className="container-app py-4 space-y-4">
        {/* ═══ Hero Card ═══ */}
        <section className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-red-dark)] animate-fade">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-300 rounded-full blur-3xl" />
          </div>

          <div className="relative text-center">
            <div className="text-5xl mb-3">💌</div>
            <h2 className="text-2xl font-black text-white mb-2">ادعُ أصدقاءك</h2>
            <p className="text-sm text-white/90 mb-5">
              احصل على <span className="font-black text-amber-300">{codeData?.rewardOnSignup ?? 100} نقطة</span> لكل صديق
              <br />
              + <span className="font-black text-amber-300">{codeData?.rewardOnFirstOrder ?? 200} نقطة</span> عند أول طلب
            </p>

            {/* Code Box */}
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/30 mb-4">
              <p className="text-xs text-white/80 mb-2">كود الإحالة الخاص بك</p>
              <div className="text-2xl font-black text-white tracking-widest mb-3" dir="ltr">
                {codeData?.referralCode || '—'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCode}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                >
                  {copied ? (
                    <>✓ تم النسخ</>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      نسخ
                    </>
                  )}
                </button>
                <button
                  onClick={share}
                  className="flex-1 bg-white text-[var(--brand-red)] font-black py-2.5 rounded-xl transition hover:bg-amber-50 flex items-center justify-center gap-2 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  شارك
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Stats ═══ */}
        <section className="grid grid-cols-3 gap-3 animate-fade delay-100">
          <div className="card text-center py-4">
            <div className="text-2xl font-black text-[var(--brand-gold)]">{stats?.total ?? 0}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">إجمالي</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-2xl font-black text-[var(--success)]">{stats?.rewarded ?? 0}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">ناجحة</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-2xl font-black text-[var(--brand-red-light)]">
              {stats?.totalPointsEarned ?? 0}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">نقاط</div>
          </div>
        </section>

        {/* ═══ How it works ═══ */}
        <section className="card animate-fade delay-150">
          <h3 className="font-black text-base mb-3">كيف يعمل؟</h3>
          <div className="space-y-3">
            {[
              { n: '1', icon: '📤', text: 'شارك كودك مع أصدقائك' },
              { n: '2', icon: '🎉', text: 'يسجّل صديقك بالكود' },
              { n: '3', icon: '💰', text: 'تحصلان على 100 نقطة فوراً' },
              { n: '4', icon: '🎁', text: '+200 نقطة إضافية عند أول طلب' },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--brand-red)]/10 flex items-center justify-center flex-shrink-0 font-black text-sm text-[var(--brand-red-light)]">
                  {step.n}
                </div>
                <span className="text-2xl">{step.icon}</span>
                <span className="text-sm text-[var(--text-secondary)] flex-1">{step.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Invites ═══ */}
        <section className="animate-fade delay-200">
          <h3 className="font-black text-base mb-3">👥 المدعوون</h3>

          {invites.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm text-[var(--text-muted)] mb-1">لم تدعُ أحداً بعد</p>
              <p className="text-xs text-[var(--text-muted)]">شارك كودك وابدأ بكسب النقاط</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              {invites.map((inv, i) => {
                const st = STATUS_LABELS[inv.status] || STATUS_LABELS.pending;
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-3 p-4 ${
                      i !== invites.length - 1 ? 'border-b border-[var(--bg-border)]' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center font-black flex-shrink-0">
                      {inv.referredName?.charAt(0) || '؟'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{inv.referredName || 'مستخدم'}</p>
                      <p className={`text-xs flex items-center gap-1 ${st.color}`}>
                        <span>{st.icon}</span>
                        <span>{st.label}</span>
                      </p>
                    </div>
                    {inv.rewardPoints > 0 && (
                      <span className="text-[var(--success)] font-black text-sm">
                        +{inv.rewardPoints}
                      </span>
                    )}
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
