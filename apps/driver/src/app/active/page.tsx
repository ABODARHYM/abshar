'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  storeName: string;
  storeAddressText: string;
  storeLatitude: number;
  storeLongitude: number;
  storePhone: string | null;
  recipientName: string;
  recipientPhone: string;
  deliveryAddressText: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  paymentMethod: string;
  total: number;
  driverEarning: number;
  customerNotes: string | null;
}

const STATUS_FLOW: Record<string, { next: string; label: string; icon: string; bg: string }> = {
  driverAssigned: { next: 'pickup', label: '📦 استلمت من المتجر', icon: '🏪', bg: 'from-blue-500' },
  accepted: { next: 'pickup', label: '📦 استلمت من المتجر', icon: '🏪', bg: 'from-blue-500' },
  ready: { next: 'pickup', label: '📦 استلمت من المتجر', icon: '🏪', bg: 'from-cyan-500' },
  preparing: { next: 'pickup', label: '📦 استلمت من المتجر', icon: '🏪', bg: 'from-amber-500' },
  pickedUp: { next: 'in-transit', label: '🛵 بدء التوصيل', icon: '🛵', bg: 'from-orange-500' },
  driverGoingToCustomer: { next: 'arrived', label: '📍 وصلت للعميل', icon: '📍', bg: 'from-orange-500' },
  arrived: { next: 'deliver', label: '✅ تم التسليم', icon: '✅', bg: 'from-emerald-500' },
  driverArrivedCustomer: { next: 'deliver', label: '✅ تم التسليم', icon: '✅', bg: 'from-emerald-500' },
};

export default function ActiveOrderPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🆕 إعادة تحميل عند إشعار WebSocket
  useEffect(() => {
    const handler = () => {
      // نستخدم reload بسيط لتحديث بيانات الصفحة
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('notification:refresh', handler);
    return () => window.removeEventListener('notification:refresh', handler);
  }, []);


  const loadOrder = async () => {
    try {
      const res = await authFetch('/api/v1/driver/orders/my?limit=5');
      if (res.ok) {
        const data = await res.json();
        const active = (data.items || []).find((o: any) =>
          !['delivered', 'cancelled'].includes(o.status)
        );
        setOrder(active || null);
      }
    } catch {}
    setLoading(false);
  };

  const doAction = async (action: string) => {
    if (!order || actionLoading) return;
    if (!confirm('تأكيد الإجراء؟')) return;

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/driver/orders/${order.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      if (res.ok) {
        await loadOrder();
        if (action === 'deliver') {
          alert('🎉 تم التسليم بنجاح!');
          router.push('/');
        }
      } else {
        const data = await res.json();
        alert(data.message || 'فشل');
      }
    } catch {}
    setActionLoading(false);
  };

  const call = (phone: string | null) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const map = (lat: number, lng: number) => {
    if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-4">
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
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
              <h1 className="font-black">🛵 طلبي الحالي</h1>
              <div className="w-10"></div>
            </div>
          </div>
        </header>
        <main className="container-app py-4">
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">🛵</p>
            <h2 className="font-black text-lg mb-2">لا يوجد طلب نشط</h2>
            <Link href="/available" className="btn btn-primary mt-4">📋 الطلبات المتاحة</Link>
          </div>
        </main>
      </div>
    );
  }

  const flow = STATUS_FLOW[order.status];

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-black text-sm">#{order.orderNumber}</h1>
            <button onClick={loadOrder} className="p-2 text-emerald-400">🔄</button>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {/* Status */}
        <div className={`card bg-gradient-to-br ${flow?.bg || 'from-gray-500'}/20 to-transparent`}>
          <div className="text-center py-2">
            <div className="text-5xl mb-2">{flow?.icon || '❓'}</div>
            <h2 className="font-black text-lg">{flow?.label || order.status}</h2>
          </div>
        </div>

        {/* Store */}
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-xl flex-shrink-0">🏪</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">استلام من</p>
              <h3 className="font-black truncate">{order.storeName}</h3>
              <p className="text-xs text-secondary mb-2 line-clamp-2">📍 {order.storeAddressText}</p>
              <div className="flex gap-2">
                {order.storePhone && (
                  <button onClick={() => call(order.storePhone)} className="btn btn-ghost btn-sm text-blue-400">📞 اتصل</button>
                )}
                <button onClick={() => map(order.storeLatitude, order.storeLongitude)} className="btn btn-ghost btn-sm text-emerald-400">🗺️ الاتجاهات</button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-xl flex-shrink-0">🏠</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">التوصيل إلى</p>
              <h3 className="font-black truncate">{order.recipientName}</h3>
              <p className="text-xs text-secondary mb-2 line-clamp-2">📍 {order.deliveryAddressText}</p>
              <div className="flex gap-2">
                <button onClick={() => call(order.recipientPhone)} className="btn btn-ghost btn-sm text-blue-400">📞 اتصل</button>
                <button onClick={() => map(order.deliveryLatitude, order.deliveryLongitude)} className="btn btn-ghost btn-sm text-emerald-400">🗺️ الاتجاهات</button>
              </div>
            </div>
          </div>
        </div>

        {/* Money */}
        <div className="card">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted">المطلوب من العميل</p>
              <p className="text-2xl font-black text-amber-400">{Number(order.total).toFixed(0)} ر.ي</p>
              <p className="text-xs text-muted mt-1">{order.paymentMethod === 'cash_on_delivery' ? '💵 نقد' : '💳 إلكتروني'}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted">ربحك</p>
              <p className="text-2xl font-black text-emerald-400">{Number(order.driverEarning).toFixed(0)} ر.ي</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.customerNotes && (
          <div className="card bg-amber-500/10 border-amber-500/30">
            <p className="text-xs text-amber-400 font-bold mb-1">📝 ملاحظة العميل</p>
            <p className="text-sm">{order.customerNotes}</p>
          </div>
        )}
      </main>

      {flow && (
        <div className="sticky-bottom">
          <div className="sticky-bottom-inner">
            <button
              onClick={() => doAction(flow.next)}
              disabled={actionLoading}
              className="btn btn-primary btn-lg btn-full"
            >
              {actionLoading ? '⏳...' : flow.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
