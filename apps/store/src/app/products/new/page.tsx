'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

export default function NewProductPage() {
  const router = useRouter();
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/v1/store-owner/categories')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nameAr.trim()) { setError('الاسم بالعربية مطلوب'); return; }
    if (!nameEn.trim()) { setError('الاسم بالإنجليزية مطلوب'); return; }
    if (!price || Number(price) <= 0) { setError('السعر غير صحيح'); return; }

    setSaving(true);

    try {
      const body: any = {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        basePrice: Number(price),
        isAvailable,
      };
      if (description.trim()) body.descriptionAr = description.trim();
      if (categoryId) body.categoryId = categoryId;
      if (imageUrl.trim()) body.imageUrl = imageUrl.trim();

      const res = await authFetch('/api/v1/store-owner/products', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'فشل الحفظ');
        setSaving(false);
        return;
      }

      router.push('/products');
    } catch (err) {
      setError('خطأ في الاتصال: ' + (err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--bg-border)] safe-top">
        <div className="container-app">
          <div className="flex items-center justify-between h-14">
            <Link href="/products" className="p-2 -mr-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-black">➕ منتج جديد</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {error && (
          <div className="card border-r-4 border-r-red-500">
            <p className="text-sm font-bold text-red-400">⚠️ {error}</p>
          </div>
        )}

        <div className="card">
          <label className="block text-sm font-bold mb-2">الاسم بالعربية *</label>
          <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)}
            placeholder="مندي لحم" className="input" />
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-2">الاسم بالإنجليزية *</label>
          <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
            placeholder="Lamb Mandi" className="input" dir="ltr" />
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-2">الوصف</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف مختصر..." className="input" rows={2} />
        </div>

        <div className="card">
          <label className="block text-sm font-bold mb-2">السعر (ر.ي) *</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            placeholder="3500" className="input" dir="ltr" />
        </div>

        {categories.length > 0 && (
          <div className="card">
            <label className="block text-sm font-bold mb-2">التصنيف</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">— بدون تصنيف —</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
        )}

        <div className="card">
          <label className="block text-sm font-bold mb-2">رابط الصورة</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..." className="input" dir="ltr" />
        </div>

        <div className="card">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-5 h-5 accent-blue-500" />
            <span className="font-bold text-sm">متوفر للبيع</span>
          </label>
        </div>
      </main>

      <div className="sticky-bottom">
        <div className="sticky-bottom-inner">
          <button onClick={submit} disabled={saving} className="btn btn-primary btn-lg btn-full">
            {saving ? '⏳ جاري الحفظ...' : '💾 حفظ المنتج'}
          </button>
        </div>
      </div>
    </div>
  );
}
