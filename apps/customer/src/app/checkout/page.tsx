'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { authFetch } from '@/lib/auth';

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
  deliveryFee: number;
  minOrderAmount: number;
  isOpen: boolean;
}

interface Address {
  id: string;
  label: string;
  cityName: string | null;
  districtName: string | null;
  areaName: string | null;
  landmark: string | null;
  isDefault: boolean;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('absher_cart');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function clearCart() {
  localStorage.removeItem('absher_cart');
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cart = loadCart();
    setItems(cart);

    if (cart.length === 0) {
      setLoading(false);
      return;
    }

    const storeId = cart[0].storeId;

    Promise.all([
      authFetch(`/api/v1/stores/${storeId}`).then((r) => r.ok ? r.json() : null),
      authFetch('/api/v1/addresses').then((r) => r.ok ? r.json() : []),
    ]).then(([storeData, addressesData]) => {
      setStore(storeData);
      const list = Array.isArray(addressesData) ? addressesData : addressesData.items || [];
      setAddresses(list);
      const def = list.find((a: Address) => a.isDefault);
      if (def) setSelectedAddressId(def.id);
      else if (list[0]) setSelectedAddressId(list[0].id);
    }).catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = store?.deliveryFee || 0;
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');

    try {
      const res = await authFetch('/api/v1/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          storeId: store?.id,
          subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.message || 'كود غير صالح');
        return;
      }

      let discountAmount = 0;
      if (data.discountType === 'percent') {
        discountAmount = Math.round((subtotal * Number(data.discountValue)) / 100);
      } else if (data.discountType === 'fixed') {
        discountAmount = Number(data.discountValue);
      }

      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discountAmount,
      });
    } catch {
      setCouponError('خطأ في التحقق');
    }
  };

  const submitOrder = async () => {
    if (!store || !selectedAddressId) {
      setError('اختر عنوان التوصيل');
      return;
    }
    if (store.minOrderAmount && subtotal < store.minOrderAmount) {
      setError(`الحد الأدنى ${store.minOrderAmount} ر.ي`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: any = {
        storeId: store.id,
        addressId: selectedAddressId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };

      if (notes.trim()) payload.customerNotes = notes.trim();
      if (appliedCoupon) payload.couponCode = appliedCoupon.code;
      payload.idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const res = await authFetch('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'فشل إنشاء الطلب');
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/orders/${data.id}?new=1`);
    } catch (err) {
      setError('خطأ في الاتصال: ' + (err as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="تأكيد الطلب" showBack />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="تأكيد الطلب" showBack />
        <main className="container-app py-4">
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">🛒</p>
            <h2 className="font-black text-lg mb-2">السلة فارغة</h2>
            <Link href="/stores" className="btn btn-primary mt-4">تصفح المتاجر</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <TopBar title="تأكيد الطلب" showBack />

      <main className="container-app py-4 space-y-4">
        {error && (
          <div className="card border-r-4 border-r-red-500">
            <p className="text-sm font-bold text-red-400">⚠️ {error}</p>
          </div>
        )}

        {/* Coupon */}
        <div className="card">
          <h3 className="font-black text-sm mb-3">🎫 كود الخصم</h3>
          {!appliedCoupon ? (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="أدخل الكود"
                  className="input flex-1"
                />
                <button onClick={applyCoupon} className="btn btn-primary px-6">
                  تطبيق
                </button>
              </div>
              {couponError && <p className="text-xs text-red-400 mt-2">{couponError}</p>}
            </>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30">
              <div>
                <p className="font-black text-sm text-success">{appliedCoupon.code}</p>
                <p className="text-xs text-muted">خصم {appliedCoupon.discountAmount} ر.ي</p>
              </div>
              <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-red-400 text-xs font-bold">
                إزالة
              </button>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm">📍 عنوان التوصيل</h3>
            <Link href="/addresses/new" className="text-xs text-accent font-bold">+ جديد</Link>
          </div>
          {addresses.length === 0 ? (
            <p className="text-xs text-muted">لا يوجد عنوان — أضف عنواناً أولاً</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedAddressId === addr.id
                      ? 'border-accent bg-accent/10'
                      : 'border-[var(--bg-border)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{addr.label}</div>
                    <div className="text-xs text-muted">
                      {[addr.cityName, addr.districtName, addr.areaName].filter(Boolean).join('، ')}
                      {addr.landmark && ` — ${addr.landmark}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card">
          <label className="block text-sm font-bold mb-2">📝 ملاحظات</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات إضافية..."
            className="input"
            rows={2}
          />
        </div>

        {/* Summary */}
        <div className="card">
          <h3 className="font-black mb-3">ملخص الفاتورة</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">المجموع الفرعي</span><span className="font-bold">{subtotal.toFixed(0)} ر.ي</span></div>
            <div className="flex justify-between"><span className="text-muted">التوصيل</span><span className="font-bold">{deliveryFee.toFixed(0)} ر.ي</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>الخصم</span><span className="font-bold">-{discount.toFixed(0)} ر.ي</span></div>}
            <div className="divider !my-2" />
            <div className="flex justify-between text-base"><span className="font-black">الإجمالي</span><span className="font-black text-accent text-lg">{total.toFixed(0)} ر.ي</span></div>
          </div>
        </div>
      </main>

      <div className="sticky-bottom">
        <div className="sticky-bottom-inner">
          <button
            onClick={submitOrder}
            disabled={submitting || !selectedAddressId}
            className="btn btn-primary btn-lg btn-full"
          >
            {submitting ? '⏳ جاري الإنشاء...' : `تنفيذ الطلب — ${total.toFixed(0)} ر.ي`}
          </button>
        </div>
      </div>
    </div>
  );
}
