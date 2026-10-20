'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';
import { authFetch } from '@/lib/auth';

interface Favorite {
  id: string;
  productId: string;
  nameAr: string;
  price: number;
  imageUrl: string | null;
  storeId: string;
  storeName: string;
  isAvailable: boolean;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/favorites')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setItems(d.items || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    if (!confirm('إزالة من المفضلة؟')) return;
    try {
      const res = await authFetch(`/api/v1/favorites/${id}`, { method: 'DELETE' });
      if (res.ok) setItems(items.filter((i) => i.id !== id));
    } catch {}
  };

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar title="المفضلة" showBack />

      <main className="container-app py-4 space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">❤️</p>
            <h2 className="font-black text-lg mb-2">لا توجد مفضلة</h2>
            <p className="text-sm text-muted mb-4">أضف منتجاتك المفضلة من أي متجر</p>
            <Link href="/stores" className="btn btn-primary">تصفح المتاجر</Link>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.nameAr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{item.nameAr}</h3>
                <p className="text-xs text-muted truncate">{item.storeName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-black text-accent">{item.price.toFixed(0)} ر.ي</span>
                  {!item.isAvailable && <span className="badge badge-danger text-[10px]">غير متوفر</span>}
                </div>
              </div>
              <button onClick={() => remove(item.id)} className="p-2 text-red-400 self-start">🗑️</button>
            </div>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
