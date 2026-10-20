'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

const STATUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: 'جديد', icon: '🔴', color: 'border-red-500' },
  accepted: { label: 'مقبول', icon: '✅', color: 'border-blue-500' },
  preparing: { label: 'تحضير', icon: '👨‍🍳', color: 'border-amber-500' },
  ready: { label: 'جاهز', icon: '🍽️', color: 'border-emerald-500' },
  driverAssigned: { label: 'مندوب في الطريق', icon: '🛵', color: 'border-purple-500' },
  pickedUp: { label: 'تم الاستلام', icon: '📦', color: 'border-orange-500' },
  driverGoingToCustomer: { label: 'في الطريق', icon: '🛣️', color: 'border-blue-500' },
  driverArrivedCustomer: { label: 'وصل', icon: '📍', color: 'border-emerald-500' },
  delivered: { label: 'تم التسليم', icon: '🎉', color: 'border-emerald-600' },
  cancelled: { label: 'ملغي', icon: '❌', color: 'border-gray-500' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const res = await authFetch(`/api/v1/store-owner/orders/${orderId}`);
      if (res.ok) setOrder(await res.json());
    } catch {}
    setLoading(false);
  };

  const action = async (act: string) => {
    if (acting) return;
    if (!confirm(`تأكيد ${act}؟`)) return;
    setActing(true);
    try {
      const res = await authFetch(`/api/v1/store-owner/orders/${orderId}/${act}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      if (res.ok) await loadOrder();
      else {
        const data = await res.json();
        alert(data.message || 'فشل');
      }
    } catch {}
    setActing(false);
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
      <div className="app-shell bg-[var(--bg-base)] p-6 text-center">
        <p className="text-6xl mb-4">😕</p>
        <p>الطلب غير موجود</p>
        <Link href="/orders" className="btn btn-primary mt-4">العودة</Link>
      </div>
    );
  }

  const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending;

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => router.back()} className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="font-black text-sm">طلب #{order.orderNumber}</h1>
            <button onClick={loadOrder} className="p-2 text-blue-400">🔄</button>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {/* Status */}
        <div className={`card border-r-4 ${st.color}`}>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{st.icon}</div>
            <div>
              <h2 className="font-black text-lg">{st.label}</h2>
              <p className="text-xs text-muted">
                {new Date(order.createdAt).toLocaleString('ar-YE')}
              </p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="card">
          <h3 className="font-black mb-3">👤 العميل</h3>
          <div className="space-y-1 text-sm">
            <p className="font-bold">{order.customerName || order.recipientName}</p>
            {order.recipientPhone && (
              <a href={`tel:${order.recipientPhone}`} className="text-accent text-xs">📞 {order.recipientPhone}</a>
            )}
          </div>
        </div>

        {/* Address */}
        {order.deliveryAddressText && (
          <div className="card">
            <h3 className="font-black mb-2">📍 عنوان التوصيل</h3>
            <p className="text-sm text-secondary">{order.deliveryAddressText}</p>
          </div>
        )}

        {/* Items */}
        <div className="card">
          <h3 className="font-black mb-3">📦 المنتجات ({order.items?.length || 0})</h3>
          <div className="space-y-2">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.productName} × {item.quantity}</span>
                <span className="font-bold">{Number(item.lineTotal).toFixed(0)} ر.ي</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="flex justify-between font-black">
            <span>الإجمالي</span>
            <span className="text-accent">{Number(order.total).toFixed(0)} ر.ي</span>
          </div>
        </div>

        {/* Notes */}
        {order.customerNotes && (
          <div className="card border-amber-500/30 bg-amber-500/5">
            <p className="text-xs text-amber-400 font-bold mb-1">📝 ملاحظة العميل</p>
            <p className="text-sm">{order.customerNotes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="card">
          <h3 className="font-black mb-3">⚡ إجراءات</h3>
          <div className="space-y-2">
            {order.status === 'pending' && (
              <>
                <button onClick={() => action('reject')} className="btn btn-ghost btn-full text-red-400">❌ رفض</button>
                <button onClick={() => action('accept')} className="btn btn-primary btn-full">✅ قبول</button>
              </>
            )}
            {order.status === 'accepted' && (
              <button onClick={() => action('preparing')} className="btn btn-primary btn-full">👨‍🍳 بدء التحضير</button>
            )}
            {order.status === 'preparing' && (
              <button onClick={() => action('ready')} className="btn btn-primary btn-full">✅ الطلب جاهز</button>
            )}
            {['delivered', 'cancelled', 'rejected'].includes(order.status) && (
              <p className="text-center text-sm text-muted py-2">
                {order.status === 'delivered' ? '🎉 تم التسليم' : '❌ ملغي'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
