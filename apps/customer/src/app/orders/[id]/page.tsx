
'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';

interface OrderItem {
  id: string;
  productId: string;
  nameAr: string;
  price: number;
  quantity: number;
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
  paymentStatus: string;
  deliveryAddress: any;
  items: OrderItem[];
  notes: string | null;
  createdAt: string;
  deliveredAt: string | null;
  storeName?: string;
  storePhone?: string;
  driverName?: string;
  driverPhone?: string;
}

const STEPS = [
  { key: 'pending', label: 'تم الاستلام', icon: '📝' },
  { key: 'accepted', label: 'تم القبول', icon: '✅' },
  { key: 'preparing', label: 'قيد التحضير', icon: '👨‍🍳' },
  { key: 'ready', label: 'جاهز', icon: '🍽️' },
  { key: 'driverAssigned', label: 'المندوب في الطريق', icon: '🛵' },
  { key: 'pickedUp', label: 'تم الاستلام', icon: '📦' },
  { key: 'driverGoingToCustomer', label: 'في الطريق إليك', icon: '🛣️' },
  { key: 'driverArrivedCustomer', label: 'وصل', icon: '📍' },
  { key: 'delivered', label: 'تم التسليم', icon: '🎉' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  driverAssigned: 4,
  pickedUp: 5,
  driverGoingToCustomer: 6,
  driverArrivedCustomer: 7,
  delivered: 8,
};

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const isNew = searchParams.get('new') === '1';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(isNew);

  const loadOrder = () => {
    if (!orderId) return;
    const token = localStorage.getItem('accessToken');

    fetch(`/api/v1/orders/my/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then(setOrder)
      .catch(() => setError('لم يتم العثور على الطلب'))
      .finally(() => setLoading(false));
  };

  const [wsToken, setWsToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setWsToken(token);
    loadOrder();

    // Polling كل 5 ثواني
    const interval = setInterval(loadOrder, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // WebSocket للتحديثات الفورية
  useOrderNotifications(wsToken, loadOrder);

  const cancelOrder = async () => {
    if (!order || !confirm('هل تريد إلغاء هذا الطلب؟')) return;
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`/api/v1/orders/my/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'إلغاء من العميل' }),
      });

      if (res.ok) {
        loadOrder();
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="تفاصيل الطلب" showBack />
        <main className="container-app py-4 space-y-3">
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="skeleton h-40 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="تفاصيل الطلب" showBack />
        <main className="container-app py-4">
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="font-black text-lg mb-2">لم يتم العثور على الطلب</h2>
            <Link href="/orders" className="btn btn-primary mt-4">
              العودة للطلبات
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const currentStep = STATUS_ORDER[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
  const canCancel = ['pending', 'accepted', 'preparing'].includes(order.status);

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-8">
      <TopBar title={`طلب #${order.orderNumber}`} showBack />

      {/* Success modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-6 animate-fade">
          <div className="bg-[var(--bg-card)] rounded-3xl p-8 max-w-sm w-full text-center border border-[var(--bg-border)]">
            <div className="text-6xl mb-4 animate-bounce-in">🎉</div>
            <h2 className="font-black text-xl mb-2">تم استلام طلبك!</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              سيتواصل معك المتجر قريباً لتأكيد الطلب
            </p>
            <div className="space-y-2 mb-6 text-right text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">رقم الطلب</span>
                <span className="font-bold" dir="ltr">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الإجمالي</span>
                <span className="font-black text-[var(--brand-gold)]">{Number(order.total).toFixed(0)} ر.ي</span>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="btn btn-primary btn-full"
            >
              متابعة
            </button>
          </div>
        </div>
      )}

      <main className="container-app py-4 space-y-4">
        {/* Status Card */}
        <section className="card animate-fade">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              isCancelled ? 'bg-red-500/10' : 'bg-[var(--brand-red)]/10'
            }`}>
              {isCancelled ? '❌' : '🚀'}
            </div>
            <div className="flex-1">
              <h2 className="font-black text-base">
                {isCancelled ? 'الطلب ملغي' : STEPS[Math.min(currentStep, STEPS.length - 1)].label}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(order.createdAt).toLocaleString('ar-YE')}
              </p>
            </div>
          </div>

          {/* Progress steps */}
          {!isCancelled && (
            <div className="space-y-3 mt-4">
              {STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all ${
                      done
                        ? active
                          ? 'bg-[var(--brand-red)] text-white ring-4 ring-[var(--brand-red)]/20'
                          : 'bg-[var(--success)]/20 text-[var(--success)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {done && !active ? '✓' : step.icon}
                    </div>
                    <span className={`text-sm ${
                      active ? 'font-black text-white' : done ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {step.label}
                    </span>
                    {active && (
                      <span className="text-xs text-[var(--brand-red-light)] font-bold mr-auto animate-pulse">
                        جاري...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Driver info if assigned */}
        {order.driverName && !isCancelled && (
          <section className="card animate-fade delay-100 border-[var(--brand-gold)]/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--brand-gold)]/10 flex items-center justify-center text-2xl">
                🛵
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--text-muted)]">المندوب</p>
                <p className="font-bold text-sm">{order.driverName}</p>
              </div>
              {order.driverPhone && (
                <a
                  href={`tel:${order.driverPhone}`}
                  className="btn btn-primary btn-sm"
                >
                  📞 اتصال
                </a>
              )}
            </div>
          </section>
        )}

        {/* Store */}
        {order.storeName && (
          <section className="card animate-fade delay-150">
            <p className="text-xs text-[var(--text-muted)] mb-1">المتجر</p>
            <p className="font-bold text-sm">{order.storeName}</p>
          </section>
        )}

        {/* Items */}
        <section className="card animate-fade delay-200">
          <h3 className="font-black text-base mb-3">المنتجات ({order.items.length})</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{item.nameAr}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {item.quantity} × {Number(item.price ?? 0).toFixed(0)} ر.ي
                  </p>
                </div>
                <span className="font-bold whitespace-nowrap">
                  {Number(item.total ?? 0).toFixed(0)} ر.ي
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Address */}
        {order.deliveryAddress && (
          <section className="card animate-fade delay-250">
            <h3 className="font-black text-base mb-2">عنوان التوصيل</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {[
                order.deliveryAddress.cityName,
                order.deliveryAddress.districtName,
                order.deliveryAddress.areaName,
              ].filter(Boolean).join('، ')}
            </p>
            {order.deliveryAddress.landmark && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                🏛️ {order.deliveryAddress.landmark}
              </p>
            )}
          </section>
        )}

        {/* Notes */}
        {order.notes && (
          <section className="card animate-fade delay-300">
            <h3 className="font-black text-base mb-2">ملاحظات</h3>
            <p className="text-sm text-[var(--text-secondary)]">{order.notes}</p>
          </section>
        )}

        {/* Summary */}
        <section className="card animate-fade delay-350">
          <h3 className="font-black text-base mb-3">ملخص الفاتورة</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">المجموع الفرعي</span>
              <span className="font-bold">{Number(order.subtotal).toFixed(0)} ر.ي</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">التوصيل</span>
              <span className="font-bold">
                {Number(order.deliveryFee) > 0
                  ? `${Number(order.deliveryFee).toFixed(0)} ر.ي`
                  : 'مجاني'}
              </span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-[var(--success)]">
                <span>الخصم</span>
                <span className="font-bold">-{Number(order.discountAmount).toFixed(0)} ر.ي</span>
              </div>
            )}
            <div className="divider !my-2" />
            <div className="flex justify-between text-base">
              <span className="font-black">الإجمالي</span>
              <span className="font-black text-[var(--brand-gold)] text-lg">
                {Number(order.total).toFixed(0)} ر.ي
              </span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
              <span>طريقة الدفع</span>
              <span>{order.paymentMethod === 'cash' ? '💵 نقداً' : '💳 إلكتروني'}</span>
            </div>
          </div>
        </section>

        {/* Cancel */}
        {canCancel && (
          <button
            onClick={cancelOrder}
            className="btn btn-ghost btn-full text-[var(--danger)] border-[var(--danger)]/30 animate-fade delay-400"
          >
            إلغاء الطلب
          </button>
        )}
      </main>
    </div>
  );
}
