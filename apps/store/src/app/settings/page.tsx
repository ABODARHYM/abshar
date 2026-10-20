'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

export default function SettingsPage() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [nameAr, setNameAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [phone, setPhone] = useState('');
  const [addressText, setAddressText] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [prepTime, setPrepTime] = useState('');

  useEffect(() => {
    loadStore();
  }, []);

  const loadStore = async () => {
    try {
      const res = await authFetch('/api/v1/store-owner/my-store');
      if (res.ok) {
        const data = await res.json();
        setStore(data);
        setNameAr(data.nameAr || '');
        setDescriptionAr(data.descriptionAr || '');
        setPhone(data.phone || '');
        setAddressText(data.addressText || '');
        setDeliveryFee(String(data.deliveryFee || 0));
        setMinOrder(String(data.minOrderAmount || 0));
        setPrepTime(String(data.avgPrepMinutes || 25));
      }
    } catch {}
    setLoading(false);
  };

  const toggleOpen = async () => {
    if (!store) return;
    try {
      const res = await authFetch('/api/v1/store-owner/my-store', {
        method: 'PATCH',
        body: JSON.stringify({ isOpen: !store.isOpen }),
      });
      if (res.ok) loadStore();
    } catch {}
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/store-owner/my-store', {
        method: 'PATCH',
        body: JSON.stringify({
          nameAr,
          descriptionAr: descriptionAr || undefined,
          phone: phone || undefined,
          addressText,
          deliveryFee: Number(deliveryFee),
          minOrderAmount: Number(minOrder),
          avgPrepMinutes: Number(prepTime),
        }),
      });

      if (res.ok) {
        await loadStore();
        setEditing(false);
      } else {
        const data = await res.json();
        alert(data.message || 'فشل الحفظ');
      }
    } catch {
      alert('خطأ');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)] p-4">
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

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
            <h1 className="font-black">⚙️ الإعدادات</h1>
            <button onClick={() => setEditing(!editing)} className="p-2 text-blue-400">
              {editing ? '✖️' : '✏️'}
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-4 space-y-4">
        {/* Store status */}
        {store && (
          <div className={`card ${store.isOpen ? 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30' : 'bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${store.isOpen ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {store.isOpen ? '🟢' : '🔴'}
              </div>
              <div className="flex-1">
                <h3 className="font-black">{store.isOpen ? 'المتجر مفتوح' : 'المتجر مغلق'}</h3>
                <p className="text-xs text-muted">{store.isOpen ? 'يستقبل طلبات' : 'لا يستقبل طلبات'}</p>
              </div>
              <button onClick={toggleOpen} className="btn btn-ghost btn-sm">
                {store.isOpen ? 'إيقاف' : 'فتح'}
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        {store && (
          <div className="card space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted mb-1">اسم المتجر</label>
              {editing ? (
                <input type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="input" />
              ) : (
                <p className="font-black">{store.nameAr}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1">الوصف</label>
              {editing ? (
                <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} className="input" rows={2} />
              ) : (
                <p className="text-sm">{store.descriptionAr || '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1">الهاتف</label>
              {editing ? (
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" dir="ltr" />
              ) : (
                <p className="text-sm font-mono" dir="ltr">{store.phone || '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1">العنوان</label>
              {editing ? (
                <input type="text" value={addressText} onChange={(e) => setAddressText(e.target.value)} className="input" />
              ) : (
                <p className="text-sm">{store.addressText || '—'}</p>
              )}
            </div>
          </div>
        )}

        {/* Numbers */}
        {store && (
          <div className="card space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted mb-1">رسوم التوصيل</label>
              {editing ? (
                <input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="input" dir="ltr" />
              ) : (
                <p className="font-black">{store.deliveryFee} ر.ي</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1">الحد الأدنى للطلب</label>
              {editing ? (
                <input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="input" dir="ltr" />
              ) : (
                <p className="font-black">{store.minOrderAmount} ر.ي</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1">وقت التحضير (دقيقة)</label>
              {editing ? (
                <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="input" dir="ltr" />
              ) : (
                <p className="font-black">{store.avgPrepMinutes} دقيقة</p>
              )}
            </div>
          </div>
        )}

        {/* Notifications Setup */}
        <Link href="/notifications-setup" className="card flex items-center gap-3 hover:border-blue-500">
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <div className="font-bold text-sm">الإشعارات</div>
            <div className="text-xs text-[var(--text-muted)]">تفعيل الإشعارات الفورية</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        {editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-lg flex-1">إلغاء</button>
            <button onClick={save} disabled={saving} className="btn btn-primary btn-lg flex-1">
              {saving ? '...' : '💾 حفظ'}
            </button>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          <Link href="/" className="bottom-nav-item"><span className="text-xl">🏠</span><span>الرئيسية</span></Link>
          <Link href="/orders" className="bottom-nav-item"><span className="text-xl">📥</span><span>الطلبات</span></Link>
          <Link href="/products" className="bottom-nav-item"><span className="text-xl">🍔</span><span>المنتجات</span></Link>
          <Link href="/settings" className="bottom-nav-item active"><span className="text-xl">⚙️</span><span>الإعدادات</span></Link>
        </div>
      </nav>
    </div>
  );
}
