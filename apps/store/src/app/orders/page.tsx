'use client';
import { authFetch } from '@/lib/auth';
import { sound } from '@/lib/sounds';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OrderItem {
  id: string;
  nameAr: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: any;
  items: OrderItem[];
  notes: string | null;
  createdAt: string;
}

type TabKey = 'new' | 'preparing' | 'ready' | 'all';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'new', label: 'جديدة', icon: '🔴' },
  { key: 'preparing', label: 'قيد التحضير', icon: '👨‍🍳' },
  { key: 'ready', label: 'جاهزة', icon: '✅' },
  { key: 'all', label: 'الكل', icon: '📋' },
];

const STATUS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'جديد', color: 'bg-red-500', icon: '🔴' },
  accepted: { label: 'مقبول', color: 'bg-blue-500', icon: '✅' },
  preparing: { label: 'قيد التحضير', color: 'bg-amber-500', icon: '👨‍🍳' },
  ready: { label: 'جاهز', color: 'bg-emerald-500', icon: '🍽️' },
  driverAssigned: { label: 'مندوب في الطريق', color: 'bg-purple-500', icon: '🛵' },
  pickedUp: { label: 'تم الاستلام', color: 'bg-orange-500', icon: '📦' },
  delivered: { label: 'تم التسليم', color: 'bg-emerald-600', icon: '🎉' },
  cancelled: { label: 'ملغي', color: 'bg-gray-500', icon: '❌' },
  rejected: { label: 'مرفوض', color: 'bg-gray-500', icon: '🚫' },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadOrders();

    // Polling كل 10 ثوانٍ
    const interval = setInterval(loadOrders, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🆕 إعادة تحميل فورية عند إشعار WebSocket
  useEffect(() => {
    const handler = () => loadOrders();
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadOrders = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await fetch('/api/v1/store-owner/orders?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError('فشل تحميل الطلبات');
        return;
      }

      const data = await res.json();
      const list: Order[] = Array.isArray(data) ? data : data.items || [];

      // اكتشف طلب جديد
      if (list.length > 0) {
        const newest = list[0];
        const lastSeen = localStorage.getItem('store_last_seen_order');
        if (lastSeen && newest.id !== lastSeen) {
          playSound();
        }
        localStorage.setItem('store_last_seen_order', newest.id);
      }

      setOrders(list);
      setError('');
    } catch (e) {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const playSound = () => {
    if (!soundEnabled) return;
    sound.play('order-new');
  };

  const updateStatus = async (orderId: string, action: string, body: any = {}) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const res = await authFetch(`/api/v1/store-owner/orders/${orderId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadOrders();
      } else {
        const data = await res.json();
        alert(data.message || 'فشل التحديث');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
  };

  const filtered = orders.filter((o) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'new') return o.status === 'pending';
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.status);
    if (activeTab === 'ready') return o.status === 'ready';
    return true;
  });

  const counts = {
    new: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length,
    ready: orders.filter((o) => o.status === 'ready').length,
    all: orders.length,
  };

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-black">📥 الطلبات</h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 ${soundEnabled ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}
            >
              {soundEnabled ? '🔔' : '🔕'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[var(--bg-base)] border-b border-[var(--bg-border)] py-3">
        <div className="container-app">
          <div className="h-scroll no-scrollbar">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              const count = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--bg-border)]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      active ? 'bg-white text-blue-500' : 'bg-red-500 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="container-app py-4 space-y-3">
        {error && (
          <div className="card border-r-4 border-r-red-500">
            <p className="text-sm font-bold text-red-400">⚠️ {error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="skeleton h-6 w-1/3 mb-2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">
              {activeTab === 'new' ? '📭' : activeTab === 'ready' ? '✅' : '📋'}
            </p>
            <h2 className="font-black text-lg mb-2">
              {activeTab === 'new' ? 'لا توجد طلبات جديدة' : 'لا توجد طلبات'}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {activeTab === 'new' ? 'سيتم التنبيه عند وصول طلب جديد' : 'اختر تبويباً آخر'}
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={() => updateStatus(order.id, 'accept')}
              onReject={() => {
                if (confirm('رفض هذا الطلب؟')) updateStatus(order.id, 'reject', { reason: 'مرفوض من المتجر' });
              }}
              onPreparing={() => updateStatus(order.id, 'preparing')}
              onReady={() => updateStatus(order.id, 'ready')}
            />
          ))
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>الرئيسية</span>
          </Link>
          <Link href="/orders" className="bottom-nav-item active">
            <span className="text-xl">📥</span>
            <span>الطلبات</span>
          </Link>
          <Link href="/products" className="bottom-nav-item">
            <span className="text-xl">🍔</span>
            <span>المنتجات</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>الإعدادات</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function OrderCard({
  order,
  onAccept,
  onReject,
  onPreparing,
  onReady,
}: {
  order: Order;
  onAccept: () => void;
  onReject: () => void;
  onPreparing: () => void;
  onReady: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS[order.status] || STATUS.pending;

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `منذ ${diff} ثانية`;
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return new Date(date).toLocaleDateString('ar-YE');
  };

  return (
    <div className={`card border-r-4 ${
      order.status === 'pending' ? 'border-r-red-500' : 'border-r-[var(--bg-border)]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl ${status.color} flex items-center justify-center text-lg`}>
            {status.icon}
          </div>
          <div>
            <h3 className="font-black text-sm" dir="ltr">#{order.orderNumber}</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{timeAgo(order.createdAt)}</p>
          </div>
        </div>
        <span className="badge badge-gray text-[10px]">
          {status.label}
        </span>
      </div>

      {/* Customer */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-sm">{order.customerName || 'عميل'}</p>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="text-xs text-blue-400 font-bold">
              📞 اتصل
            </a>
          )}
        </div>
        {order.deliveryAddress && (
          <p className="text-xs text-[var(--text-muted)]">
            📍 {[
              order.deliveryAddress.areaName,
              order.deliveryAddress.districtName,
              order.deliveryAddress.cityName,
            ].filter(Boolean).join('، ')}
          </p>
        )}
      </div>

      {/* Items */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm py-2 border-t border-[var(--bg-border)]"
      >
        <span className="text-[var(--text-muted)]">{order.items?.length || 0} منتج</span>
        <span className="font-black text-emerald-400">{Number(order.total).toFixed(0)} ر.ي</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && order.items && (
        <div className="border-t border-[var(--bg-border)] pt-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span>{item.nameAr} <span className="text-[var(--text-muted)]">× {item.quantity}</span></span>
              <span className="font-bold">{Number(item.total).toFixed(0)} ر.ي</span>
            </div>
          ))}
          {order.notes && (
            <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-[10px] text-amber-400 font-bold">📝 ملاحظة:</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{order.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {order.status === 'pending' && (
          <>
            <button onClick={onReject} className="btn btn-ghost btn-sm flex-1 text-red-400 border-red-500/30">
              ❌ رفض
            </button>
            <button
              onClick={onAccept}
              className="btn btn-sm flex-1 text-white font-black"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              ✅ قبول
            </button>
          </>
        )}

        {order.status === 'accepted' && (
          <button
            onClick={onPreparing}
            className="btn btn-sm btn-full text-white font-black"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            👨‍🍳 بدء التحضير
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={onReady}
            className="btn btn-sm btn-full text-white font-black"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            ✅ الطلب جاهز
          </button>
        )}

        {order.status === 'ready' && (
          <div className="w-full text-center py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-sm text-emerald-400 font-bold">⏳ بانتظار المندوب...</p>
          </div>
        )}

        {['delivered', 'cancelled', 'rejected'].includes(order.status) && (
          <div className="w-full text-center py-2 rounded-xl bg-[var(--bg-elevated)]">
            <p className="text-sm text-[var(--text-muted)]">{status.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
