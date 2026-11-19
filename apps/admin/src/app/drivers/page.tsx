'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import AdminTable from '@/components/AdminTable';
import { authFetch } from '@/lib/auth';

type Driver = {
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  vehicleType?: string | null;
  status: string;
  availability: string;
  ratingAvg: number;
  ratingCount: number;
};

type CreatedCredentials = {
  fullName: string;
  phone: string;
  username: string;
  temporaryPassword: string;
  status: string;
};

const VEHICLES = [
  { value: 'motorcycle', label: 'دراجة نارية' },
  { value: 'car', label: 'سيارة' },
  { value: 'bicycle', label: 'دراجة هوائية' },
  { value: 'scooter', label: 'سكوتر' },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<CreatedCredentials | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    vehicleType: 'motorcycle',
    vehiclePlate: '',
  });

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/admin/drivers?limit=100');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || body?.error || `تعذر تحميل المندوبين (HTTP ${res.status})`);
      }
      const data = await res.json();
      setDrivers(Array.isArray(data.items) ? data.items : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);

  const resetCreate = () => {
    setShowCreate(false);
    setCreated(null);
    setFormError('');
    setForm({ fullName: '', phone: '', email: '', vehicleType: 'motorcycle', vehiclePlate: '' });
  };

  const createDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await authFetch('/api/v1/admin/drivers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          vehicleType: form.vehicleType,
          ...(form.vehiclePlate.trim() ? { vehiclePlate: form.vehiclePlate.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message) ? data.message.join('، ') : data.message;
        throw new Error(message || `فشل إنشاء الحساب (HTTP ${res.status})`);
      }
      setCreated(data);
      await loadDrivers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'تعذر إنشاء حساب المندوب');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (driver: Driver) => {
    const nextStatus = driver.status === 'active' ? 'suspended' : 'active';
    const label = nextStatus === 'active' ? 'تفعيل' : 'إيقاف';
    if (!confirm(`هل تريد ${label} حساب المندوب ${driver.fullName}؟`)) return;
    try {
      const res = await authFetch(`/api/v1/admin/drivers/${driver.userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `فشل تحديث الحالة (HTTP ${res.status})`);
      }
      await loadDrivers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث حالة المندوب');
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const text = `اسم المستخدم: ${created.username}\nكلمة المرور المؤقتة: ${created.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setFormError('تعذر النسخ تلقائياً؛ انسخ بيانات الدخول يدوياً');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'المندوب',
      render: (d: Driver) => (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center text-success font-black flex-shrink-0">🛵</div>
          <div>
            <div className="font-bold">{d.fullName || 'مندوب'}</div>
            <div className="text-xs text-[var(--text-muted)]" dir="ltr">{d.phone}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'availability',
      label: 'التوفر',
      render: (d: Driver) => (
        <span className={`badge ${d.availability === 'online' ? 'badge-success' : d.availability === 'busy' ? 'badge-warning' : 'badge-gray'} text-[10px]`}>
          {d.availability === 'online' ? '🟢 متصل' : d.availability === 'busy' ? '🟡 مشغول' : '⚪ غير متصل'}
        </span>
      ),
    },
    { key: 'rating', label: 'التقييم', render: (d: Driver) => <span>⭐ {Number(d.ratingAvg || 0).toFixed(1)}</span> },
    {
      key: 'vehicle',
      label: 'المركبة',
      render: (d: Driver) => <span className="text-xs">{VEHICLES.find((v) => v.value === d.vehicleType)?.label || d.vehicleType || '—'}</span>,
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (d: Driver) => (
        <span className={`badge ${d.status === 'active' ? 'badge-success' : d.status === 'pending' ? 'badge-warning' : 'badge-danger'} text-[10px]`}>
          {d.status === 'active' ? '✅ نشط' : d.status === 'pending' ? '⏳ بانتظار التفعيل' : '❌ موقوف'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (d: Driver) => (
        <button onClick={(e) => { e.stopPropagation(); void toggleStatus(d); }} className={`btn btn-sm ${d.status === 'active' ? 'btn-danger' : 'btn-primary'}`}>
          {d.status === 'active' ? '🚫 إيقاف' : '✅ تفعيل'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <AdminHeader
        title="🛵 إدارة المناديب"
        subtitle={`${drivers.length} مندوب مسجل`}
        action={{ label: 'إضافة مندوب', icon: '＋', onClick: () => { setCreated(null); setFormError(''); setShowCreate(true); } }}
      />
      {error && <div role="alert" className="card mb-4 border border-red-500/40 text-red-500">{error}</div>}
      <AdminTable columns={columns} data={drivers} keyField="userId" loading={loading} emptyMessage={error ? 'تعذر تحميل المندوبين' : 'لا يوجد مندوبون حتى الآن'} />

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3" onMouseDown={(e) => { if (e.target === e.currentTarget && !created) resetCreate(); }}>
          <div className="card w-full max-w-lg max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="create-driver-title">
            {!created ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 id="create-driver-title" className="text-xl font-black">إضافة مندوب جديد</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">سيتم إنشاء حساب دخول وملف مندوب في خطوة واحدة</p>
                  </div>
                  <button type="button" className="btn btn-ghost" onClick={resetCreate} aria-label="إغلاق">✕</button>
                </div>
                {formError && <div role="alert" className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-500">{formError}</div>}
                <form onSubmit={createDriver} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">اسم المندوب *</label>
                    <input className="input w-full" required minLength={2} maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="الاسم الرباعي" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">رقم الهاتف *</label>
                    <input className="input w-full" required type="tel" dir="ltr" pattern="\\+?[0-9]{7,20}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+9677XXXXXXXX" />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">سيكون رقم الهاتف هو اسم المستخدم لتسجيل الدخول</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">البريد الإلكتروني (اختياري)</label>
                    <input className="input w-full" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@example.com" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold mb-2">نوع المركبة</label>
                      <select className="input w-full" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                        {VEHICLES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">رقم اللوحة (اختياري)</label>
                      <input className="input w-full" maxLength={20} value={form.vehiclePlate} onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })} placeholder="رقم اللوحة" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-muted)]">
                    سيتم توليد كلمة مرور مؤقتة قوية تلقائياً. ستظهر مرة واحدة بعد إنشاء الحساب.
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-ghost flex-1" onClick={resetCreate} disabled={saving}>إلغاء</button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={saving}>{saving ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب المندوب'}</button>
                  </div>
                </form>
              </>
            ) : (
              <div>
                <div className="text-center mb-5">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 className="text-xl font-black">تم إنشاء حساب المندوب</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{created.fullName}</p>
                </div>
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                  <p className="font-bold text-amber-500 text-sm">احفظ بيانات الدخول الآن — لن تظهر كلمة المرور مرة أخرى</p>
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">اسم المستخدم (رقم الهاتف)</div>
                    <div className="font-mono font-bold" dir="ltr">{created.username}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">كلمة المرور المؤقتة</div>
                    <div className="font-mono font-bold break-all select-all" dir="ltr">{created.temporaryPassword}</div>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">حالة الحساب: بانتظار تفعيل المندوب من قائمة الإدارة.</div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" className="btn btn-ghost flex-1" onClick={() => void copyCredentials()}>نسخ بيانات الدخول</button>
                  <button type="button" className="btn btn-primary flex-1" onClick={resetCreate}>تم، إغلاق</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
