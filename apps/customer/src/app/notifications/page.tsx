
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import PushToggle from '@/components/PushToggle';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  category: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login?redirect=/notifications'); return; }

    const qs = unreadOnly ? '?unreadOnly=true&limit=50' : '?limit=50';

    fetch(`/api/v1/notifications${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const markRead = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const remove = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="الإشعارات" />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="الإشعارات" />

      <main className="container-app py-4 space-y-4">
        <PushToggle />
        {/* Controls */}
        <div className="flex items-center gap-2 animate-fade">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              unreadOnly
                ? 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--bg-border)]'
            }`}
          >
            غير المقروءة {unreadCount > 0 && `(${unreadCount})`}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-ghost btn-sm">
              تعليم الكل كمقروء
            </button>
          )}
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="card text-center py-16 animate-fade">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="font-black text-lg mb-2">لا توجد إشعارات</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {unreadOnly ? 'كل الإشعارات مقروءة' : 'ستظهر هنا تحديثات طلباتك'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n, i) => (
              <div
                key={n.id}
                className={`card animate-fade flex gap-3 items-start ${
                  !n.isRead ? 'border-r-4 border-r-[var(--brand-red)]' : ''
                }`}
                style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  !n.isRead ? 'bg-[var(--brand-red)]/15' : 'bg-[var(--bg-elevated)]'
                }`}>
                  {n.category === 'order' ? '📦' :
                   n.category === 'delivery' ? '🛵' :
                   n.category === 'loyalty' ? '🎁' :
                   n.category === 'referral' ? '💌' :
                   n.category === 'promo' ? '🎉' : '🔔'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm ${!n.isRead ? 'font-black' : 'font-bold'}`}>
                      {n.title}
                    </h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2">
                    {new Date(n.createdAt).toLocaleString('ar-YE', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
