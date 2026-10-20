
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import TopBar from '@/components/TopBar';

interface CartItem {
  productId: string;
  storeId: string;
  nameAr: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

interface Store {
  id: string;
  nameAr: string;
  logoUrl: string | null;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
}

interface Address {
  id: string;
  label: string;
  cityName: string | null;
  districtName: string | null;
  areaName: string | null;
  landmark: string | null;
  phone: string | null;
  isDefault: boolean;
}

interface Coupon {
  code: string;
  discountAmount: number;
  type: 'percent' | 'fixed' | 'free_delivery';
  message: string;
}

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('absher_cart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearCart() {
  localStorage.removeItem('absher_cart');
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'wallet'>('cash');

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Loading + submit
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load data
  useEffect(() => {
    const cart = loadCart();
    setItems(cart);

    if (cart.length === 0) {
      setLoading(false);
      return;
    }

    const storeId = cart[0].storeId;
    const token = localStorage.getItem('accessToken');

    Promise.all([
      fetch(`/api/v1/stores/${storeId}`).then((r) => (r.ok ? r.json() : null)),
      token
        ? fetch('/api/v1/addresses', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        : Promise.resolve([]),
      token
        ? fetch('/api/v1/profile', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([storeData, addresses, profileData]) => {
        setStore(storeData);
        const list: Address[] = Array.isArray(addresses) ? addresses : (addresses.items || []);
        const def = list.find((a) => a.isDefault) || list[0] || null;
        setAddress(def);
        if (profileData?.phone) setContactPhone(profileData.phone);
      })
      .catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const deliveryFee = store?.deliveryFee ?? 0;
  const discount = coupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setApplyingCoupon(true);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          storeId: store?.id,
          subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.message || 'الكود غير صالح');
        setCoupon(null);
        return;
      }

      // Compute discount
      let discountAmount = 0;
      let type: Coupon['type'] = 'fixed';

      if (data.type === 'percent' || data.discountType === 'percent') {
        const pct = Number(data.value ?? data.discountValue ?? 0);
        discountAmount = Math.round((subtotal * pct) / 100);
        if (data.maxDiscount) discountAmount = Math.min(discountAmount, Number(data.maxDiscount));
        type = 'percent';
      } else if (data.type === 'free_delivery') {
        discountAmount = deliveryFee;
        type = 'free_delivery';
      } else {
        discountAmount = Number(data.value ?? data.discountValue ?? 0);
        type = 'fixed';
      }

      setCoupon({
        code: couponCode.trim().toUpperCase(),
        discountAmount,
        type,
        message: data.message || 'تم تطبيق الخصم',
      });
    } catch {
      setCouponError('فشل التحقق من الكود');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const submitOrder = async () => {
    if (submitting) return;
    setError('');

    // Validations
    if (!address) {
      setError('يجب اختيار عنوان التوصيل');
      return;
    }
    if (!contactPhone.trim()) {
      setError('يجب إدخال رقم التواصل');
      return;
    }
    if (store && !store.isOpen) {
      setError('المتجر مغلق حالياً');
      return;
    }
    if (store && store.minOrder > 0 && subtotal < store.minOrder) {
      setError(`الحد الأدنى للطلب ${store.minOrder} ر.ي`);
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const payload: any = {
        storeId: store?.id,
        addressId: address.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        // الدفع النقدي هو الافتراضي في النظام
      };

      // أضف الحقول الاختيارية فقط
      if (notes.trim()) payload.customerNotes = notes.trim();
      if (coupon?.code) payload.couponCode = coupon.code;
      if (typeof window !== 'undefined') {
        payload.idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'فشل إنشاء الطلب');
        setSubmitting(false);
        return;
      }

      // Success — clear cart + go to success page
      clearCart();
      router.push(`/orders/${data.id}?new=1`);
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="تأكيد الطلب" showBack />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-6 w-1/3 mb-3" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="app-shell bg-[var(--bg-base)] flex items-center justify-center min-h-screen">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="font-black text-xl mb-2">السلة فارغة</h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            لا يمكن إتمام الطلب بدون منتجات
          </p>
          <Link href="/stores" className="btn btn-primary">
            تصفح المتاجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-40">
      <TopBar title="تأكيد الطلب" showBack />

      <main className="container-app py-4 space-y-4">
        {/* Errors */}
        {error && (
          <div className="card border-r-4 border-r-[var(--danger)] animate-slide-down">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* Store closed */}
        {store && !store.isOpen && (
          <div className="card border-r-4 border-r-[var(--danger)] animate-slide-down">
            <p className="text-sm font-bold text-[var(--danger)]">
              ⚠️ المتجر مغلق حالياً — لا يمكن إتمام الطلب
            </p>
          </div>
        )}

        {/* ═══ Coupon ═══ */}
        <section className="card animate-fade">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <h3 className="font-black text-sm flex-1">هل لديك قسيمة تخفيض؟</h3>
            {coupon && (
              <button onClick={removeCoupon} className="text-xs text-[var(--danger)] font-bold">
                إزالة
              </button>
            )}
          </div>

          {!coupon ? (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  placeholder="أدخل كود الخصم"
                  className="input flex-1"
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  onClick={applyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                  className="btn btn-primary px-6"
                >
                  {applyingCoupon ? 'جاري...' : 'تطبيق'}
                </button>
              </div>
              {couponError && (
                <p className="text-xs text-[var(--danger)] mt-2 font-bold">{couponError}</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div className="flex-1">
                <p className="font-black text-sm text-[var(--success)]">{coupon.code}</p>
                <p className="text-xs text-[var(--text-muted)]">خصم {coupon.discountAmount.toFixed(0)} ر.ي</p>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Address ═══ */}
        <section className="card animate-fade delay-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="font-black text-sm flex-1">عنوان التوصيل</h3>
            <Link href="/addresses" className="text-xs text-[var(--brand-red-light)] font-bold">
              تغيير
            </Link>
          </div>

          {address ? (
            <div className="text-sm">
              <p className="font-bold mb-1">{address.label}</p>
              <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                {[address.cityName, address.districtName, address.areaName]
                  .filter(Boolean)
                  .join('، ')}
                {address.landmark && ` — ${address.landmark}`}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-muted)] mb-3">لا يوجد عنوان محفوظ</p>
              <Link href="/addresses/new" className="btn btn-outline btn-sm">
                + إضافة عنوان
              </Link>
            </div>
          )}
        </section>

        {/* ═══ Contact Phone ═══ */}
        <section className="card animate-fade delay-150">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 className="font-black text-sm flex-1">رقم التواصل</h3>
          </div>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+967 777 123 456"
            className="input"
            dir="ltr"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            سيتم التواصل معك على هذا الرقم عند الحاجة
          </p>
        </section>

        {/* ═══ Notes ═══ */}
        <section className="card animate-fade delay-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="font-black text-sm flex-1">ملاحظات الطلب</h3>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات إضافية للطلب أو للمندوب..."
            className="input"
            rows={2}
          />
        </section>

        {/* ═══ Payment Method ═══ */}
        <section className="card animate-fade delay-250">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-red-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <h3 className="font-black text-sm flex-1">طريقة الدفع</h3>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--bg-border)] cursor-pointer hover:bg-[var(--bg-card-hover)] transition">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
                className="w-4 h-4 accent-[var(--brand-red)]"
              />
              <span className="text-2xl">💵</span>
              <div className="flex-1">
                <p className="font-bold text-sm">الدفع عند الاستلام</p>
                <p className="text-xs text-[var(--text-muted)]">نقداً للمندوب</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--bg-border)] opacity-50 cursor-not-allowed">
              <input type="radio" name="payment" disabled className="w-4 h-4" />
              <span className="text-2xl">👛</span>
              <div className="flex-1">
                <p className="font-bold text-sm">المحفظة الإلكترونية</p>
                <p className="text-xs text-[var(--text-muted)]">قريباً</p>
              </div>
            </label>
          </div>
        </section>

        {/* ═══ Invoice Summary ═══ */}
        <section className="card animate-fade delay-300">
          <h3 className="font-black text-base mb-3">ملخص الفاتورة</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">إجمالي المنتجات</span>
              <span className="font-bold">{subtotal.toFixed(0)} ر.ي</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">رسوم التوصيل</span>
              <span className="font-bold">
                {deliveryFee > 0 ? `${deliveryFee.toFixed(0)} ر.ي` : 'مجاني'}
              </span>
            </div>
            {coupon && discount > 0 && (
              <div className="flex justify-between text-[var(--success)]">
                <span>الخصم ({coupon.code})</span>
                <span className="font-bold">-{discount.toFixed(0)} ر.ي</span>
              </div>
            )}
            <div className="divider !my-2" />
            <div className="flex justify-between text-base">
              <span className="font-black">الإجمالي</span>
              <span className="font-black text-[var(--brand-gold)] text-lg">
                {total.toFixed(0)} ر.ي
              </span>
            </div>
          </div>
        </section>

        {/* ═══ Order Items ═══ */}
        <section className="card animate-fade delay-350">
          <h3 className="font-black text-base mb-3">
            المنتجات ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">
                  {item.nameAr} × {item.quantity}
                </span>
                <span className="font-bold">{(item.price * item.quantity).toFixed(0)} ر.ي</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ═══ Sticky Submit ═══ */}
      <div className="sticky-bottom">
        <div className="sticky-bottom-inner flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-[var(--text-muted)]">الإجمالي</p>
            <p className="font-black text-[var(--brand-gold)] text-lg">{total.toFixed(0)} ر.ي</p>
          </div>
          <button
            onClick={submitOrder}
            disabled={submitting || !address || store?.isOpen === false}
            className="btn btn-primary btn-lg px-8 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                جاري الإنشاء...
              </>
            ) : (
              'تنفيذ الطلب'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
