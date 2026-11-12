'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

const API = '/api/v1';

interface City { id: string; nameAr: string; }
interface Category { id: string; nameAr: string; }
interface Store {
  id: string; nameAr: string; logoUrl: string | null;
  ratingAvg: number; ratingCount: number;
  deliveryFee: number; avgPrepMinutes: number; isOpen: boolean;
}

const ICONS: Record<string, string> = {
  'مطاعم': '🍔', 'وجبات': '🍔', 'مشروبات': '🥤', 'مقاهي': '☕',
  'بقال': '🛒', 'صيدلي': '💊', 'حلويات': '🍰', 'عصائر': '🧃',
  'عسل': '🍯', 'خضروات': '🥬', 'فواكه': '🍎', 'مخبز': '🥖',
  'مشويات': '🍖', 'بحري': '🐟',
};

function getIcon(name: string): string {
  for (const k of Object.keys(ICONS)) {
    if (name.includes(k)) return ICONS[k];
  }
  return '🏪';
}

export default function HomePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const citiesP = fetch(`${API}/geography/cities`).then((r) => r.ok ? r.json() : []).catch(() => []);
        const catsP = fetch(`${API}/categories`).then((r) => r.ok ? r.json() : []).catch(() => []);
        const storesP = fetch(`${API}/stores`).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] }));

        const [c, cat, s] = await Promise.all([citiesP, catsP, storesP]);

        setCities(Array.isArray(c) ? c : []);
        setCategories(Array.isArray(cat) ? cat : []);

        const list = Array.isArray(s) ? s : (s?.items || []);
        console.log('[Home] Stores:', list.length);
        setStores(list);
      } catch (e) {
        setError('فشل الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openStores = stores.filter((s) => s.isOpen);

  return (
    <div className="app-shell bg-[var(--bg-base)]">
      <TopBar showSearch />

      <main className="container-app py-4 space-y-5">
        <section>
          <h2 className="text-2xl font-black mb-1">أهلاً بك 👋</h2>
          <p className="text-sm text-[var(--text-muted)]">ماذا تريد أن تطلب اليوم؟</p>
        </section>

        <Link href="/stores">
          <div className="input flex items-center gap-2 text-[var(--text-muted)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>ابحث عن مطعم أو متجر...</span>
          </div>
        </Link>

        {categories.length > 0 && (
          <section>
            <h3 className="font-black text-base mb-3">التصنيفات</h3>
            <div className="h-scroll no-scrollbar -mx-4 px-4">
              {categories.slice(0, 10).map((cat) => (
                <Link key={cat.id} href={`/stores?categoryId=${cat.id}`} className="w-[76px] flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--bg-border)] flex items-center justify-center text-3xl">
                    {getIcon(cat.nameAr)}
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight">
                    {cat.nameAr}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="hero-header">
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div>
                <div className="text-xs font-bold text-white/80 mb-1">🎉 عرض خاص</div>
                <div className="text-lg font-black text-white leading-tight mb-2">
                  توصيل مجاني<br />أول 3 طلبات
                </div>
                <span className="inline-block text-[11px] bg-white/20 text-white px-2 py-1 rounded-full font-bold">
                  WELCOME
                </span>
              </div>
              <div className="text-6xl">🚀</div>
            </div>
          </div>
        </section>

        {cities.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {cities.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--bg-border)] text-xs font-bold whitespace-nowrap">
                📍 {c.nameAr}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card border-r-4 border-r-[var(--danger)]">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-base">المتاجر المميزة</h3>
            <Link href="/stores" className="text-xs text-[var(--brand-red)] font-bold">
              عرض الكل ({stores.length})
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="card flex gap-3">
                  <div className="skeleton w-20 h-20 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : openStores.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">🏪</div>
              <p className="text-[var(--text-muted)] text-sm">لا توجد متاجر متاحة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openStores.map((store) => (
                <Link key={store.id} href={`/stores/${store.id}`}>
                  <div className="card flex gap-3 items-center">
                    <div className="w-20 h-20 rounded-xl bg-[var(--bg-elevated)] flex-shrink-0 overflow-hidden">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.nameAr} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold truncate">{store.nameAr}</h4>
                        {store.isOpen && <span className="badge badge-green text-[10px]">مفتوح</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-1">
                        <span className="flex items-center gap-1">
                          <span className="text-[var(--brand-gold)]">⭐</span>
                          <span className="font-bold">{Number(store.ratingAvg ?? 5).toFixed(1)}</span>
                          <span className="text-[var(--text-muted)]">({store.ratingCount ?? 0})</span>
                        </span>
                        {store.avgPrepMinutes > 0 && <span>⏱️ {store.avgPrepMinutes} د</span>}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        🚚 {store.deliveryFee ? `${store.deliveryFee} ر.ي` : 'مجاني'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
