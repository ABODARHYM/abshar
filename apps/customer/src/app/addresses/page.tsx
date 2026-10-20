
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';

interface Address {
  id: string;
  label: string;
  cityName: string | null;
  districtName: string | null;
  areaName: string | null;
  street: string | null;
  landmark: string | null;
  phone: string | null;
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
}

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAddresses = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/addresses');
      return;
    }

    setLoading(true);
    fetch('/api/v1/addresses', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || [];
        setAddresses(list);
      })
      .catch(() => setError('فشل تحميل العناوين'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا العنوان؟')) return;
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/v1/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {}
  };

  const handleSetDefault = async (id: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`/api/v1/addresses/${id}/set-default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === id })),
        );
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="العناوين" showBack />
        <main className="container-app py-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-1/2 mb-2" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <TopBar title="العناوين" showBack />

      <main className="container-app py-4 space-y-4">
        {error && (
          <div className="card border-r-4 border-r-[var(--danger)]">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="card bg-[var(--bg-elevated)] border-[var(--brand-gold)]/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📍</span>
            <div className="flex-1">
              <p className="text-sm font-bold mb-1">عنوان التوصيل الافتراضي</p>
              <p className="text-xs text-[var(--text-muted)]">
                سيتم استخدام العنوان المحدد افتراضياً عند إنشاء طلب جديد
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {addresses.length === 0 ? (
          <div className="card text-center py-12 animate-fade">
            <div className="text-6xl mb-4">🏠</div>
            <h2 className="font-black text-lg mb-2">لا توجد عناوين</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              أضف عنوانك الأول لبدء الطلبات
            </p>
            <Link href="/addresses/new" className="btn btn-primary">
              + إضافة عنوان
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr, i) => (
              <div
                key={addr.id}
                className={`card animate-fade ${
                  addr.isDefault ? 'border-[var(--brand-red)]/50 ring-2 ring-[var(--brand-red)]/20' : ''
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    addr.isDefault ? 'bg-[var(--brand-red)] text-white' : 'bg-[var(--bg-elevated)]'
                  }`}>
                    {addr.isDefault ? '⭐' : '📍'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">{addr.label}</h3>
                      {addr.isDefault && (
                        <span className="badge badge-red text-[10px]">افتراضي</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {[addr.cityName, addr.districtName, addr.areaName, addr.street]
                        .filter(Boolean)
                        .join('، ')}
                    </p>
                    {addr.landmark && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        🏛️ {addr.landmark}
                      </p>
                    )}
                    {addr.phone && (
                      <p className="text-xs text-[var(--text-muted)] mt-1" dir="ltr">
                        📞 {addr.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/addresses/${addr.id}/edit`}
                    className="btn btn-ghost btn-sm flex-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    تعديل
                  </Link>

                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="btn btn-ghost btn-sm flex-1"
                    >
                      تعيين افتراضي
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="btn btn-ghost btn-sm text-[var(--danger)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M3 6h18M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sticky Add */}
      <div className="sticky-bottom">
        <div className="sticky-bottom-inner">
          <Link href="/addresses/new" className="btn btn-primary btn-lg btn-full">
            + إضافة عنوان جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
