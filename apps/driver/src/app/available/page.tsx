'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';
import { sound } from '@/lib/sounds';

interface AvailableOrder {
  id: string;
  orderNumber: string;
  status: string;
  storeId: string;
  storeName: string;
  storeAddressText: string;
  storeLatitude: number;
  storeLongitude: number;
  storePhone: string | null;
  customerName: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddressText: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  driverEarning: number;
  customerNotes: string | null;
  placedAt: string;
  readyAt: string | null;
}

export default function AvailablePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [router]);

  // 🆕 إعادة تحميل عند إشعار WebSocket
  useEffect(() => {
    const handler = () => {
      // نستخدم reload بسيط لتحديث بيانات الصفحة
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);


  const loadOrders = async () => {
    try {
      const res = await authFetch('/api/v1/driver/orders/available');
      if (res.ok) {
        const data = await res.json();
        const newList = data.items || [];
        const previousCount = orders.length;
        setOrders(newList);
        if (newList.length > previousCount && previousCount > 0) {
          sound.play('order-ready');
        }
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch {}
    setLoading(false);
  };

  const acceptOrder = async (orderId: string) => {
    if (accepting) return;
    setAccepting(orderId);

    try {
      const res = await authFetch(`/api/v1/driver/orders/${orderId}/accept`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('✅ تم قبول الطلب!');
        router.push('/active');
      } else {
        const data = await res.json();
        alert(data.message || 'فشل القبول');
      }
    } catch {
      alert('خطأ في الاتصال');
    } finally {
      setAccepting(null);
    }
  };

  const rejectOrder = async (orderId: string) => {
    if (!confirm('تجاهل هذا الطلب؟')) return;
    try {
      await authFetch(`/api/v1/driver/orders/${orderId}/reject`, {
        method: 'POST',
      });
      await loadOrders();
    } catch {}
  };

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
            <h1 className="font-black">📋 الطلبات المتاحة</h1>
            <button onClick={loadOrders} className="p-2 text-emerald-400">
              🔄
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-3">
        {error && (
          <div className="card border-r-4 border-r-red-500">
            <p className="text-sm font-bold text-red-400">⚠️ {error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card">
                <div className="skeleton h-6 w-1/3 mb-2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">📭</p>
            <h2 className="font-black text-lg mb-2">لا توجد طلبات متاحة</h2>
            <p className="text-sm text-[var(--text-muted)]">
              تأكد أنك في وضع الاتصال + انتظر طلبات جديدة
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="card border-r-4 border-r-emerald-500 animate-pulse-glow">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-lg">
                    📦
                  </div>
                  <div>
                    <h3 className="font-black text-sm" dir="ltr">#{order.orderNumber}</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">جاهز للاستلام</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-muted)]">ربحك</div>
                  <div className="text-xl font-black text-emerald-400">
                    {order.driverEarning} ر.ي
                  </div>
                </div>
              </div>

              {/* Store */}
              <div className="bg-[var(--bg-elevated)] rounded-xl p-3 mb-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">🏪</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">من المتجر</p>
                    <p className="font-bold text-sm truncate">{order.storeName}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      📍 {order.storeAddressText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="bg-[var(--bg-elevated)] rounded-xl p-3 mb-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl">🏠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">إلى العميل</p>
                    <p className="font-bold text-sm truncate">{order.recipientName}</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      📍 {order.deliveryAddressText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="flex items-center justify-between text-xs mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <span className="font-bold text-amber-400">
                  {order.paymentMethod === 'cash_on_delivery' ? '💵 نقد عند الاستلام' : '💳 مدفوع'}
                </span>
                <span className="font-black text-lg text-white">
                  {Number(order.total).toFixed(0)} {order.currency}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => rejectOrder(order.id)}
                  disabled={accepting === order.id}
                  className="btn btn-ghost btn-sm flex-1 text-red-400 border-red-500/30"
                >
                  ❌ تجاهل
                </button>
                <button
                  onClick={() => acceptOrder(order.id)}
                  disabled={accepting === order.id}
                  className="btn btn-sm flex-1 text-white font-black"
                  style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
                >
                  {accepting === order.id ? '⏳ جاري القبول...' : '✅ قبول الطلب'}
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>الرئيسية</span>
          </Link>
          <Link href="/available" className="bottom-nav-item active">
            <span className="text-xl">📋</span>
            <span>المتاحة</span>
          </Link>
          <Link href="/earnings" className="bottom-nav-item">
            <span className="text-xl">💰</span>
            <span>أرباحي</span>
          </Link>
          <Link href="/profile" className="bottom-nav-item">
            <span className="text-xl">👤</span>
            <span>حسابي</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
