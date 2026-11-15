'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import { authFetch } from '@/lib/auth';

const API = '/api/v1/admin/store-applications';

export default function StoreApplicationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = status ? `${API}?status=${status}` : API;
      const r = await authFetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذر تحميل الطلبات');
      setItems(Array.isArray(d) ? d : d.items || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const approve = async (item: any) => {
    if (!confirm(`هل تريد الموافقة على طلب متجر "${item.store_name_ar}"؟`)) return;
    setBusy(item.id);
    setError('');
    try {
      const r = await authFetch(`${API}/${item.id}/approve`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'فشلت الموافقة');
      alert('تمت الموافقة وإنشاء حساب صاحب المتجر. المتجر لا يزال غير مفعل.');
      setSelected(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const reject = async (item: any) => {
    const reason = prompt('اكتب سبب رفض طلب المتجر:');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('سبب الرفض يجب ألا يقل عن 3 أحرف');
      return;
    }

    setBusy(item.id);
    setError('');
    try {
      const r = await authFetch(`${API}/${item.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'فشل رفض الطلب');
      setSelected(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const date = (v: string) => v
    ? new Date(v).toLocaleString('ar')
    : '—';

  return (
    <div dir="rtl" className="p-4 md:p-6">
      <AdminHeader
        title="طلبات انضمام المتاجر"
        subtitle="مراجعة طلبات أصحاب المتاجر والموافقة عليها"
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          ['pending', 'قيد المراجعة'],
          ['approved', 'تمت الموافقة'],
          ['rejected', 'مرفوضة'],
          ['', 'الكل'],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              status === value ? 'bg-accent text-white' : 'bg-[var(--bg-card)]'
            }`}>
            {label}
          </button>
        ))}
        <button onClick={load} className="btn mr-auto">↻ تحديث</button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      <div className="text-sm text-[var(--text-muted)] mb-3">
        {loading ? 'جارٍ التحميل...' : `${items.length} طلب`}
      </div>

      {loading ? (
        <div className="card text-center p-8">⏳ جارٍ تحميل الطلبات...</div>
      ) : items.length === 0 ? (
        <div className="card text-center p-8">لا توجد طلبات في هذه القائمة</div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="card space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h2 className="font-black text-lg">{item.store_name_ar}</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.owner_full_name} · {item.phone}
                  </p>
                </div>
                <span className={`badge ${
                  item.status === 'approved' ? 'badge-success' :
                  item.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {item.status === 'pending' ? 'قيد المراجعة' :
                   item.status === 'approved' ? 'مقبول' : 'مرفوض'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <Info label="التصنيف" value={item.category_name} />
                <Info label="المدينة" value={item.city_name} />
                <Info label="الحي" value={item.district_name} />
                <Info label="العنوان" value={item.address_text} />
                <Info label="هاتف التواصل" value={item.contact_phone} />
                <Info label="البريد" value={item.contact_email} />
                <Info label="تاريخ التقديم" value={date(item.created_at)} />
                <Info label="تاريخ المراجعة" value={date(item.reviewed_at)} />
              </div>

              {item.latitude != null && item.longitude != null && (
                <a className="text-blue-400 text-sm font-bold inline-block"
                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                  target="_blank" rel="noreferrer">
                  📍 عرض موقع المتجر
                </a>
              )}

              {item.review_note && (
                <p className="text-sm text-[var(--text-muted)]">
                  ملاحظة الإدارة: {item.review_note}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={() =>
                  setSelected(selected?.id === item.id ? null : item)
                }>
                  {selected?.id === item.id ? 'إخفاء التفاصيل' : 'تفاصيل الطلب'}
                </button>

                {item.status === 'pending' && (
                  <>
                    <button className="btn btn-primary"
                      disabled={!!busy}
                      onClick={() => approve(item)}>
                      {busy === item.id ? 'جارٍ التنفيذ...' : '✓ موافقة وإنشاء الحساب'}
                    </button>
                    <button className="btn text-red-400"
                      disabled={!!busy}
                      onClick={() => reject(item)}>
                      رفض الطلب
                    </button>
                  </>
                )}
              </div>

              {selected?.id === item.id && (
                <div className="rounded-xl p-3 text-xs break-all"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <div>رقم الطلب: {item.id}</div>
                  <div>اسم المتجر الإنجليزي: {item.store_name_en || '—'}</div>
                  <div>الإحداثيات: {item.latitude}, {item.longitude}</div>
                  <div>حالة الطلب: {item.status}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: any }) {
  return (
    <div className="min-w-0">
      <span className="text-[var(--text-muted)]">{label}: </span>
      <span className="font-bold break-words">{value || '—'}</span>
    </div>
  );
}
