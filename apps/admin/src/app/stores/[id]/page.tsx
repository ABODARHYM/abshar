'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth';

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params?.id as string;
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    loadStore();
  }, [storeId]);

  const loadStore = async () => {
    try {
      // ✅ استخدام /stores/:id (العام) بدلاً من /admin/stores/:id
      const [storeRes, productsRes] = await Promise.all([
        authFetch(`/api/v1/stores/${storeId}`),
        authFetch(`/api/v1/products?storeId=${storeId}&limit=100`),
      ]);

      if (!storeRes.ok) {
        setError(`فشل تحميل المتجر (HTTP ${storeRes.status})`);
        return;
      }

      const storeData = await storeRes.json();
      setStore(storeData);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.items || productsData || []);
      }
    } catch (e) {
      setError('خطأ في الاتصال: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!store || acting) return;
    const newStatus = store.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`تغيير الحالة إلى ${newStatus}؟`)) return;

    setActing(true);
    try {
      const res = await authFetch(`/api/v1/admin/stores/${storeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStore({ ...store, status: newStatus });
      } else {
        const data = await res.json();
        alert(data.message || 'فشل التحديث');
      }
    } catch {
      alert('خطأ في الاتصال');
    }
    setActing(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="skeleton h-40 rounded-2xl mb-4" />
        <div className="skeleton h-32 rounded-2xl" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="card text-center py-16">
          <p className="text-6xl mb-4">😕</p>
          <p className="font-bold mb-2">{error || 'المتجر غير موجود'}</p>
          <p className="text-xs text-muted mb-4" dir="ltr">Store ID: {storeId?.slice(0, 20)}...</p>
          <div className="flex gap-2 justify-center">
            <Link href="/stores" className="btn btn-primary">← عودة للمتاجر</Link>
            <button onClick={() => location.reload()} className="btn btn-ghost">🔄 إعادة</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-[var(--bg-card)] rounded-xl">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-black">🏪 تفاصيل المتجر</h1>
      </div>

      {/* Store Header */}
      <div className="card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-[var(--bg-elevated)] overflow-hidden flex-shrink-0 flex items-center justify-center">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.nameAr}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="font-size:32px">🏪</div>';
                }}
              />
            ) : (
              <div style={{ fontSize: '32px' }}>🏪</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black">{store.nameAr || 'بدون اسم'}</h2>
            <p className="text-sm text-muted">{store.nameEn || ''}</p>
            <p className="text-sm text-muted mt-1">📍 {store.addressText || '—'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`badge ${store.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                {store.status === 'active' ? '✅ نشط' : '❌ موقوف'}
              </span>
              <span className={`badge ${store.isOpen ? 'badge-success' : 'badge-gray'} text-[10px]`}>
                {store.isOpen ? '🟢 مفتوح' : '🔴 مغلق'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card text-center">
          <p className="text-xs text-muted">التقييم</p>
          <p className="text-xl font-black">⭐ {Number(store.ratingAvg || 0).toFixed(1)}</p>
          <p className="text-[10px] text-muted">{store.ratingCount || 0} تقييم</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted">التوصيل</p>
          <p className="text-xl font-black">{Number(store.deliveryFee || 0).toFixed(0)}</p>
          <p className="text-[10px] text-muted">ر.ي</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-muted">حد أدنى</p>
          <p className="text-xl font-black">{Number(store.minOrderAmount || 0).toFixed(0)}</p>
          <p className="text-[10px] text-muted">ر.ي</p>
        </div>
      </div>

      {/* Contact */}
      <div className="card mb-4">
        <h3 className="font-black mb-3">📞 معلومات التواصل</h3>
        <div className="space-y-2 text-sm">
          {store.phone && <p>📱 <span dir="ltr">{store.phone}</span></p>}
          {store.email && <p>✉️ <span dir="ltr">{store.email}</span></p>}
          {!store.phone && !store.email && <p className="text-muted text-xs">لا توجد معلومات</p>}
        </div>
      </div>

      {/* Products Count */}
      <div className="card mb-4">
        <h3 className="font-black mb-2">🍔 المنتجات</h3>
        <p className="text-2xl font-black text-accent">{products.length}</p>
        <p className="text-xs text-muted">منتج في القائمة</p>
      </div>

      {/* Actions */}
      <div className="card">
        <h3 className="font-black mb-3">⚡ إجراءات</h3>
        <button
          onClick={toggleStatus}
          disabled={acting}
          className={`btn btn-full ${store.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
        >
          {acting ? '...' : store.status === 'active' ? '🚫 إيقاف المتجر' : '✅ تفعيل المتجر'}
        </button>
      </div>
    </div>
  );
}
