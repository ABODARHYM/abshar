
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

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

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('absher_cart');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem('absher_cart', JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const cart = loadCart();
    setItems(cart);

    if (cart.length > 0) {
      const storeId = cart[0].storeId;
      fetch(`/api/v1/stores/${storeId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setStore)
        .catch(() => setStore(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const updateQty = (productId: string, qty: number) => {
    const next = qty <= 0
      ? items.filter((i) => i.productId !== productId)
      : items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i));
    setItems(next);
    saveCart(next);
  };

  const removeItem = (productId: string) => {
    const next = items.filter((i) => i.productId !== productId);
    setItems(next);
    saveCart(next);
  };

  const clearCart = () => {
    if (!confirm('هل تريد حذف كل المنتجات من السلة؟')) return;
    setItems([]);
    saveCart([]);
    router.push('/');
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const deliveryFee = store?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;
  const minOrder = store?.minOrder ?? 0;
  const belowMinimum = minOrder > 0 && subtotal < minOrder;
  const storeClosed = store && !store.isOpen;

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="السلة" showBack />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="flex gap-3">
                <div className="skeleton w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="السلة" showBack />
        <main className="container-app py-4">
          <div className="card text-center py-16 animate-fade">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="font-black text-xl mb-2">سلتك فارغة</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              ابدأ بإضافة منتجاتك المفضلة
            </p>
            <Link href="/stores" className="btn btn-primary">
              تصفح المتاجر
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-40">
      <TopBar
        title={`السلة (${items.length})`}
        showBack
        cartCount={items.reduce((s, i) => s + i.quantity, 0)}
        showCart
      />

      <main className="container-app py-4 space-y-4">
        {/* Store header */}
        {store && (
          <div className="card flex items-center gap-3 animate-fade">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.nameAr} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate text-sm">{store.nameAr}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {storeClosed ? '⚠️ مغلق حالياً' : '✅ يقبل الطلبات'}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="p-2 text-[var(--danger)] hover:bg-red-500/10 rounded-lg transition"
              title="حذف الكل"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        )}

        {/* Alerts */}
        {storeClosed && (
          <div className="card border-r-4 border-r-[var(--danger)] animate-slide-down">
            <p className="text-sm font-bold text-[var(--danger)]">
              ⚠️ المتجر مغلق حالياً — لا يمكن إتمام الطلب
            </p>
          </div>
        )}
        {belowMinimum && (
          <div className="card border-r-4 border-r-[var(--warning)] animate-slide-down">
            <p className="text-sm font-bold text-[var(--warning)]">
              📦 الحد الأدنى للطلب {minOrder} ر.ي — أضف {(minOrder - subtotal).toFixed(0)} ر.ي أخرى
            </p>
          </div>
        )}

        {/* Items */}
        <section className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.productId}
              className="card flex gap-3 items-center animate-fade"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div className="w-20 h-20 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.nameAr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1 line-clamp-2">{item.nameAr}</h4>
                <p className="text-sm font-black text-[var(--brand-gold)] mb-2">
                  {item.price.toFixed(0)} ر.ي
                </p>

                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-between bg-[var(--bg-elevated)] rounded-lg border border-[var(--bg-border)] overflow-hidden">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-[var(--brand-red-light)] font-black text-lg hover:bg-white/5"
                    >
                      +
                    </button>
                    <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center font-black text-lg hover:bg-white/5"
                    >
                      −
                    </button>
                  </div>

                  <span className="text-xs text-[var(--text-muted)] mr-auto">
                    {(item.price * item.quantity).toFixed(0)} ر.ي
                  </span>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1.5 text-[var(--danger)] hover:bg-red-500/10 rounded-lg transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Notes */}
        <section className="animate-fade delay-200">
          <label className="block text-sm font-bold mb-2">ملاحظات الطلب (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: بدون بصل، حار قليلاً..."
            className="input"
            rows={3}
          />
        </section>

        {/* Summary */}
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
            <div className="divider !my-2" />
            <div className="flex justify-between text-base">
              <span className="font-black">الإجمالي</span>
              <span className="font-black text-[var(--brand-gold)] text-lg">
                {total.toFixed(0)} ر.ي
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Sticky checkout */}
      <div className="sticky-bottom">
        <div className="sticky-bottom-inner space-y-2">
          <Link
            href="/checkout"
            className={`btn btn-primary btn-lg btn-full ${
              storeClosed || belowMinimum ? 'opacity-50 pointer-events-none' : ''
            }`}
            aria-disabled={storeClosed || belowMinimum}
          >
            <span>متابعة الطلب</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
