
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  storeName?: string;
  storeLogo?: string | null;
  itemsCount?: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'بانتظار القبول', color: 'text-amber-400', icon: '⏳' },
  accepted: { label: 'تم القبول', color: 'text-blue-400', icon: '✅' },
  preparing: { label: 'قيد التحضير', color: 'text-purple-400', icon: '👨‍🍳' },
  ready: { label: 'جاهز للاستلام', color: 'text-cyan-400', icon: '🍽️' },
  driverAssigned: { label: 'المندوب في الطريق', color: 'text-purple-400', icon: '🛵' },
  pickedUp: { label: 'تم الاستلام', color: 'text-orange-400', icon: '📦' },
  driverGoingToCustomer: { label: 'في الطريق إليك', color: 'text-blue-400', icon: '🛣️' },
  driverArrivedCustomer: { label: 'وصل للعميل', color: 'text-emerald-400', icon: '📍' },
  delivered: { label: 'تم التسليم', color: 'text-emerald-400', icon: '🎉' },
  cancelled: { label: 'ملغي', color: 'text-red-400', icon: '❌' },
  rejected: { label: 'مرفوض', color: 'text-red-400', icon: '🚫' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/v1/orders/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || [];
        setOrders(list);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  // 🆕 إعادة تحميل تلقائية عند وصول إشعار WebSocket
  useEffect(() => {
    const handler = () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      fetch('/api/v1/orders/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data) => {
          const list = Array.isArray(data) ? data : data.items || [];
          setOrders(list);
        })
        .catch(() => {});
    };
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === 'active') return !['delivered', 'cancelled', 'rejected'].includes(o.status);
    if (filter === 'done') return ['delivered', 'cancelled', 'rejected'].includes(o.status);
    return true;
  });

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="طلباتي" />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-6 w-1/3 mb-2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="طلباتي" />

      <main className="container-app py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 animate-fade">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'active', label: 'قيد التنفيذ' },
            { key: 'done', label: 'السجل' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                filter === tab.key
                  ? 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--bg-border)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Empty */}
        {filtered.length === 0 ? (
          <div className="card text-center py-16 animate-fade">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="font-black text-lg mb-2">
              {orders.length === 0 ? 'لا يوجد طلبات' : 'لا يوجد طلبات في هذه الفئة'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {orders.length === 0 && 'ابدأ بأول طلب لك الآن'}
            </p>
            {orders.length === 0 && (
              <Link href="/stores" className="btn btn-primary">
                تصفح المتاجر
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order, i) => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block animate-fade"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="card card-hover">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-xl">
                        {order.storeLogo ? (
                          <img src={order.storeLogo} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : '🏪'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">
                          {order.storeName || `طلب #${order.orderNumber}`}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          #{order.orderNumber}
                        </p>
                      </div>
                      <span className={`text-xs font-bold flex items-center gap-1 ${st.color}`}>
                        <span>{st.icon}</span>
                        <span>{st.label}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-muted)]">
                        {new Date(order.createdAt).toLocaleDateString('ar-YE', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-black text-[var(--brand-gold)]">
                        {Number(order.total).toFixed(0)} ر.ي
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
