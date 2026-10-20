'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { authFetch } from '@/lib/auth';

interface Store {
  id: string;
  nameAr: string;
  logoUrl: string | null;
  ratingAvg: number;
  deliveryFee: number;
}

interface Product {
  id: string;
  nameAr: string;
  price: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setStores([]);
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [storesRes, productsRes] = await Promise.all([
          authFetch(`/api/v1/stores?search=${encodeURIComponent(query)}`),
          authFetch(`/api/v1/products?search=${encodeURIComponent(query)}`),
        ]);

        const storesData = storesRes.ok ? await storesRes.json() : { items: [] };
        const productsData = productsRes.ok ? await productsRes.json() : { items: [] };

        setStores(storesData.items || []);
        setProducts(productsData.items || []);
      } catch {}
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="البحث" showBack />

      <main className="container-app py-4 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن متجر أو منتج..."
            className="input pr-12"
            autoFocus
          />
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="card text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-sm text-muted">اكتب حرفين على الأقل للبحث</p>
          </div>
        )}

        {!loading && query.length >= 2 && stores.length === 0 && products.length === 0 && (
          <div className="card text-center py-16">
            <p className="text-5xl mb-3">😕</p>
            <p className="text-sm text-muted">لا توجد نتائج لـ "{query}"</p>
          </div>
        )}

        {stores.length > 0 && (
          <section>
            <h3 className="font-black mb-3">🏪 المتاجر ({stores.length})</h3>
            <div className="space-y-2">
              {stores.map((s) => (
                <Link key={s.id} href={`/stores/${s.id}`} className="card flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
                    {s.logoUrl ? <img src={s.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{s.nameAr}</h4>
                    <p className="text-xs text-muted">⭐ {Number(s.ratingAvg || 0).toFixed(1)} • 🚚 {s.deliveryFee} ر.ي</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section>
            <h3 className="font-black mb-3">🍔 المنتجات ({products.length})</h3>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="card flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{p.nameAr}</h4>
                    <p className="text-xs text-muted truncate">{p.storeName}</p>
                    <p className="text-sm font-black text-accent mt-1">{p.price.toFixed(0)} ر.ي</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
