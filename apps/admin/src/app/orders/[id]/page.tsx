'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: '⏳ جديد', badge: 'badge-warning' },
  accepted: { label: '✅ مقبول', badge: 'badge-info' },
  preparing: { label: '👨‍🍳 تحضير', badge: 'badge-warning' },
  ready: { label: '🍽️ جاهز', badge: 'badge-info' },
  driverAssigned: { label: '🛵 مندوب', badge: 'badge-accent' },
  pickedUp: { label: '📦 مستلم', badge: 'badge-accent' },
  driverGoingToCustomer: { label: '🛣️ في الطريق', badge: 'badge-accent' },
  driverArrivedCustomer: { label: '📍 وصل', badge: 'badge-success' },
  delivered: { label: '🎉 تم', badge: 'badge-success' },
  cancelled: { label: '❌ ملغي', badge: 'badge-danger' },
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`/api/v1/admin/orders/${orderId}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div style={{ padding: '24px' }}><div className="skeleton h-40 rounded-2xl" /></div>;
  if (!order) return <div style={{ padding: '24px', textAlign: 'center' }}><p>الطلب غير موجود</p></div>;

  const st = STATUS_LABELS[order.status] || { label: order.status, badge: 'badge-gray' };

  return (
    <div style={{ padding: '24px' }}>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-card)] rounded-xl">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-black" dir="ltr">#{order.orderNumber}</h1>
        <span className={`badge ${st.badge} text-xs`}>{st.label}</span>
      </div>

      {/* Customer */}
      <div className="card mb-4">
        <h3 className="font-black mb-2">👤 العميل</h3>
        <p className="font-bold">{order.customerName}</p>
        <p className="text-sm text-muted" dir="ltr">{order.customerPhone}</p>
      </div>

      {/* Store */}
      <div className="card mb-4">
        <h3 className="font-black mb-2">🏪 المتجر</h3>
        <p className="font-bold">{order.storeName}</p>
      </div>

      {/* Address */}
      {order.deliveryAddressText && (
        <div className="card mb-4">
          <h3 className="font-black mb-2">📍 عنوان التوصيل</h3>
          <p className="text-sm">{order.deliveryAddressText}</p>
        </div>
      )}

      {/* Items */}
      <div className="card mb-4">
        <h3 className="font-black mb-3">📦 المنتجات</h3>
        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.productName} × {item.quantity}</span>
              <span className="font-bold">{Number(item.lineTotal).toFixed(0)} ر.ي</span>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">المجموع الفرعي</span><span>{Number(order.subtotal).toFixed(0)}</span></div>
          <div className="flex justify-between"><span className="text-muted">التوصيل</span><span>{Number(order.deliveryFee).toFixed(0)}</span></div>
          {Number(order.discountTotal) > 0 && <div className="flex justify-between text-success"><span>خصم</span><span>-{Number(order.discountTotal).toFixed(0)}</span></div>}
          <div className="flex justify-between font-black text-base pt-2 border-t">
            <span>الإجمالي</span>
            <span className="text-accent">{Number(order.total).toFixed(0)} ر.ي</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="card mb-4">
        <h3 className="font-black mb-2">💳 الدفع</h3>
        <p className="text-sm">
          {order.paymentMethod === 'cash_on_delivery' ? '💵 نقد عند الاستلام' : '💳 إلكتروني'}
        </p>
        <p className="text-sm text-muted mt-1">
          الحالة: {order.paymentStatus === 'paid' ? '✅ مدفوع' : '⏳ معلق'}
        </p>
      </div>

      {/* Timeline */}
      <div className="card">
        <h3 className="font-black mb-3">📅 التوقيتات</h3>
        <div className="space-y-2 text-xs">
          {order.placedAt && <div className="flex justify-between"><span className="text-muted">إنشاء</span><span>{new Date(order.placedAt).toLocaleString('ar-YE')}</span></div>}
          {order.acceptedAt && <div className="flex justify-between"><span className="text-muted">قبول</span><span>{new Date(order.acceptedAt).toLocaleString('ar-YE')}</span></div>}
          {order.readyAt && <div className="flex justify-between"><span className="text-muted">جاهز</span><span>{new Date(order.readyAt).toLocaleString('ar-YE')}</span></div>}
          {order.deliveredAt && <div className="flex justify-between"><span className="text-muted">تسليم</span><span>{new Date(order.deliveredAt).toLocaleString('ar-YE')}</span></div>}
        </div>
      </div>
    </div>
  );
}
