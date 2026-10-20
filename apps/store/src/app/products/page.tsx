'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  stockQuantity: number | null;
}

interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Form fields
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        authFetch('/api/v1/store-owner/products?limit=100'),
        authFetch('/api/v1/store-owner/categories'),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.items || []);
      }

      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        setCategories(Array.isArray(cats) ? cats : []);
      }
    } catch (e) {
      setError('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditing(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormDescription('');
    setFormPrice('');
    setFormCategoryId('');
    setFormImageUrl('');
    setFormAvailable(true);
    setShowForm(true);
  };

  const openEditForm = (p: Product) => {
    setEditing(p);
    setFormNameAr(p.nameAr);
    setFormNameEn(p.nameEn);
    setFormDescription(p.descriptionAr || '');
    setFormPrice(String(p.basePrice));
    setFormCategoryId(p.categoryId || '');
    setFormImageUrl(p.imageUrl || '');
    setFormAvailable(p.isAvailable);
    setShowForm(true);
  };

  const submitForm = async () => {
    if (!formNameAr.trim()) return alert('اسم المنتج مطلوب');
    if (!formNameEn.trim()) return alert('الاسم الإنجليزي مطلوب');
    if (!formPrice || Number(formPrice) <= 0) return alert('السعر غير صحيح');

    setSubmitting(true);

    const body: any = {
      nameAr: formNameAr.trim(),
      nameEn: formNameEn.trim(),
      descriptionAr: formDescription.trim() || undefined,
      basePrice: Number(formPrice),
      categoryId: formCategoryId || undefined,
      imageUrl: formImageUrl.trim() || undefined,
      isAvailable: formAvailable,
    };

    try {
      const url = editing
        ? `/api/v1/store-owner/products/${editing.id}`
        : '/api/v1/store-owner/products';
      const method = editing ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'فشل الحفظ');
        return;
      }

      setShowForm(false);
      await loadData();
    } catch {
      alert('خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('حذف هذا المنتج؟')) return;
    try {
      const res = await authFetch(`/api/v1/store-owner/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) await loadData();
      else alert('فشل الحذف');
    } catch {
      alert('خطأ');
    }
  };

  const toggleAvailable = async (p: Product) => {
    try {
      const res = await authFetch(`/api/v1/store-owner/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      if (res.ok) await loadData();
    } catch {}
  };

  const filtered = products.filter((p) => {
    if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q);
    }
    return true;
  });

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
            <h1 className="font-black">🍔 المنتجات</h1>
            <button onClick={openAddForm} className="p-2 text-blue-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="container-app py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[var(--text-muted)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="input pr-12"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="h-scroll no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                activeCategory === 'all'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--bg-border)]'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                  activeCategory === cat.id
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--bg-border)]'
                }`}
              >
                {cat.nameAr}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="container-app pb-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card flex gap-3">
                <div className="skeleton w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-6xl mb-4">📦</p>
            <h2 className="font-black text-lg mb-2">لا توجد منتجات</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              {search ? 'جرّب بحثاً آخر' : 'ابدأ بإضافة منتج جديد'}
            </p>
            <button onClick={openAddForm} className="btn text-white font-black"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              ➕ إضافة منتج
            </button>
          </div>
        ) : (
          filtered.map((product) => (
            <div key={product.id} className="card flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{product.nameAr}</h3>
                    <p className="text-xs text-[var(--text-muted)] truncate" dir="ltr">{product.nameEn}</p>
                  </div>
                  <span className={`badge ${product.isAvailable ? 'badge-green' : 'badge-gray'} text-[10px]`}>
                    {product.isAvailable ? 'متوفر' : 'مخفي'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-black text-emerald-400 text-sm">
                    {Number(product.basePrice).toFixed(0)} ر.ي
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAvailable(product)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-amber-400"
                      title="إظهار/إخفاء"
                    >
                      {product.isAvailable ? '👁️' : '🚫'}
                    </button>
                    <button
                      onClick={() => openEditForm(product)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-blue-400"
                      title="تعديل"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-400"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center animate-fade">
          <div className="bg-[var(--bg-card)] rounded-t-3xl md:rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-lg">
                {editing ? '✏️ تعديل منتج' : '➕ منتج جديد'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-[var(--text-muted)]">✖️</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">الاسم بالعربية *</label>
                <input type="text" value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder="مندي لحم" className="input" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الاسم بالإنجليزية *</label>
                <input type="text" value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="Lamb Mandi" className="input" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الوصف</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="وصف مختصر..." className="input" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">السعر (ر.ي) *</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="3500" className="input" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">التصنيف</label>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} className="input">
                  <option value="">— بدون تصنيف —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">رابط الصورة</label>
                <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..." className="input" dir="ltr" />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="w-5 h-5 accent-blue-500" />
                  <span className="font-bold text-sm">متوفر للبيع</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-lg flex-1">
                إلغاء
              </button>
              <button onClick={submitForm} disabled={submitting}
                className="btn btn-lg flex-1 text-white font-black"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                {submitting ? '...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>الرئيسية</span>
          </Link>
          <Link href="/orders" className="bottom-nav-item">
            <span className="text-xl">📥</span>
            <span>الطلبات</span>
          </Link>
          <Link href="/products" className="bottom-nav-item active">
            <span className="text-xl">🍔</span>
            <span>المنتجات</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>الإعدادات</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
