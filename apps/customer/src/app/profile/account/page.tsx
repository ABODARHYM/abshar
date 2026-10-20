
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';

export default function AccountPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    fetch('/api/v1/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setFullName(data.fullName || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'فشل الحفظ');
        return;
      }

      // Update cache
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          const u = JSON.parse(cached);
          localStorage.setItem('user', JSON.stringify({ ...u, fullName, phone }));
        } catch {}
      }

      setSuccess('تم الحفظ بنجاح');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell bg-[var(--bg-base)]">
        <TopBar title="الحساب" showBack />
        <main className="container-app py-4 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell bg-[var(--bg-base)] pb-32">
      <TopBar title="الحساب" showBack />

      <main className="container-app py-4 space-y-4">
        {error && (
          <div className="card border-r-4 border-r-[var(--danger)]">
            <p className="text-sm font-bold text-[var(--danger)]">{error}</p>
          </div>
        )}
        {success && (
          <div className="card border-r-4 border-r-[var(--success)]">
            <p className="text-sm font-bold text-[var(--success)]">✓ {success}</p>
          </div>
        )}

        <div className="card space-y-4 animate-fade">
          <div>
            <label className="block text-sm font-bold mb-2">الاسم الكامل</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">البريد الإلكتروني</label>
            <input type="email" value={email} disabled className="input opacity-60" dir="ltr" />
            <p className="text-xs text-[var(--text-muted)] mt-1">لا يمكن تغييره حالياً</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">رقم الهاتف</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" dir="ltr" />
          </div>
        </div>
      </main>

      <div className="sticky-bottom">
        <div className="sticky-bottom-inner">
          <button onClick={save} disabled={saving} className="btn btn-primary btn-lg btn-full">
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
