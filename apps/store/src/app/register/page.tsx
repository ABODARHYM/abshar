'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = '/api/v1/store-applications';

export default function StoreRegisterPage() {
  const [options, setOptions] = useState<any>({ categories: [], cities: [] });
  const [districts, setDistricts] = useState<any[]>([]);
  const [form, setForm] = useState({
    ownerFullName: '',
    phone: '',
    password: '',
    storeNameAr: '',
    storeNameEn: '',
    platformCategoryId: '',
    cityId: '',
    districtId: '',
    addressText: '',
    latitude: '',
    longitude: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const update = (key: string, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));

  const normalizePhone = (value: string) => {
    let p = value.replace(/[^\d+]/g, '');
    if (p.startsWith('+967')) return p;
    if (p.startsWith('967')) return '+' + p;
    if (p.startsWith('0')) p = p.slice(1);
    if (/^7\d{8}$/.test(p)) return '+967' + p;
    return p.startsWith('+') ? p : '+' + p;
  };

  useEffect(() => {
    fetch(`${API}/options`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || 'تعذر تحميل البيانات');
        setOptions(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingOptions(false));
  }, []);

  const changeCity = async (cityId: string) => {
    setForm((old) => ({ ...old, cityId, districtId: '' }));
    setDistricts([]);
    if (!cityId) return;

    try {
      const r = await fetch(
        `${API}/districts?cityId=${encodeURIComponent(cityId)}`
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'تعذر تحميل الأحياء');
      setDistricts(Array.isArray(d) ? d : []);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const getLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        update('latitude', String(position.coords.latitude));
        update('longitude', String(position.coords.longitude));
      },
      () => setError('تعذر تحديد الموقع. اسمح للمتصفح بالوصول للموقع وحاول مجدداً.'),
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.latitude || !form.longitude) {
      setError('يجب تحديد موقع المتجر على الخريطة أو عبر زر تحديد موقعي');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        phone: normalizePhone(form.phone),
        contactPhone: form.contactPhone
          ? normalizePhone(form.contactPhone)
          : normalizePhone(form.phone),
        districtId: form.districtId || undefined,
        storeNameEn: form.storeNameEn || undefined,
        contactEmail: form.contactEmail || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      };

      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const d = await r.json();
      if (!r.ok) {
        throw new Error(
          Array.isArray(d.message) ? d.message.join('، ') :
          d.message || 'تعذر إرسال الطلب'
        );
      }

      setSuccess(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const app = success.application;
    return (
      <main dir="rtl" className="min-h-screen p-5 flex items-center justify-center"
        style={{ background: 'var(--gradient-hero)' }}>
        <div className="card w-full max-w-lg text-center space-y-5">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-black">تم استلام طلبك بنجاح</h1>
          <p className="text-sm text-[var(--text-muted)]">
            طلبك الآن قيد مراجعة الإدارة. لن يتم تفعيل حساب المتجر إلا بعد الموافقة.
          </p>
          <div className="rounded-xl p-4 text-right space-y-3"
            style={{ background: 'var(--bg-elevated)' }}>
            <div>
              <div className="text-xs text-[var(--text-muted)]">رقم الطلب</div>
              <div dir="ltr" className="font-bold break-all">{app.id}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">رمز المتابعة الخاص</div>
              <div dir="ltr" className="font-bold break-all select-all">
                {success.trackingToken}
              </div>
            </div>
            <p className="text-xs text-amber-500">
              احتفظ برمز المتابعة. لن يظهر لك مرة أخرى بعد مغادرة هذه الصفحة.
            </p>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              sessionStorage.setItem(
                `storeApplicationTracking:${app.id}`,
                success.trackingToken
              );
              window.location.href =
                `/application-status?id=${encodeURIComponent(app.id)}`;
            }}
          >
            متابعة حالة الطلب
          </button>
          <button
            className="btn w-full"
            onClick={() => navigator.clipboard?.writeText(
              `رقم الطلب: ${app.id}\nرمز المتابعة: ${success.trackingToken}`
            )}
          >
            نسخ بيانات المتابعة
          </button>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen p-4 md:p-8"
      style={{ background: 'var(--gradient-hero)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-7">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-3xl font-black text-white">انضم إلى أبشر بي</h1>
          <p className="text-sm mt-2 text-[var(--text-muted)]">
            قدّم طلب تسجيل متجرك وانتظر مراجعة الإدارة
          </p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loadingOptions ? (
            <p className="text-center p-8">⏳ جاري تحميل البيانات...</p>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <h2 className="font-black text-lg">بيانات صاحب المتجر</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="الاسم الكامل" required>
                  <input className="input" required maxLength={160}
                    value={form.ownerFullName}
                    onChange={(e) => update('ownerFullName', e.target.value)} />
                </Field>
                <Field label="رقم الهاتف" required>
                  <input className="input" required type="tel" dir="ltr"
                    placeholder="777123456" value={form.phone}
                    onChange={(e) => update('phone', e.target.value)} />
                </Field>
                <Field label="كلمة المرور (8 أحرف على الأقل)" required>
                  <input className="input" required type="password"
                    minLength={8} maxLength={100} dir="ltr"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)} />
                </Field>
              </div>

              <hr style={{ borderColor: 'var(--bg-border)' }} />
              <h2 className="font-black text-lg">بيانات المتجر</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="اسم المتجر بالعربية" required>
                  <input className="input" required maxLength={160}
                    value={form.storeNameAr}
                    onChange={(e) => update('storeNameAr', e.target.value)} />
                </Field>
                <Field label="اسم المتجر بالإنجليزية">
                  <input className="input" dir="ltr" maxLength={160}
                    value={form.storeNameEn}
                    onChange={(e) => update('storeNameEn', e.target.value)} />
                </Field>
                <Field label="تصنيف المتجر" required>
                  <select className="input" required
                    value={form.platformCategoryId}
                    onChange={(e) => update('platformCategoryId', e.target.value)}>
                    <option value="">اختر التصنيف</option>
                    {options.categories?.map((x: any) =>
                      <option key={x.id} value={x.id}>{x.name_ar}</option>
                    )}
                  </select>
                </Field>
                <Field label="المدينة" required>
                  <select className="input" required value={form.cityId}
                    onChange={(e) => changeCity(e.target.value)}>
                    <option value="">اختر المدينة</option>
                    {options.cities?.map((x: any) =>
                      <option key={x.id} value={x.id}>{x.name_ar}</option>
                    )}
                  </select>
                </Field>
                <Field label="الحي">
                  <select className="input" value={form.districtId}
                    disabled={!form.cityId}
                    onChange={(e) => update('districtId', e.target.value)}>
                    <option value="">اختر الحي إن وجد</option>
                    {districts.map((x: any) =>
                      <option key={x.id} value={x.id}>{x.name_ar}</option>
                    )}
                  </select>
                </Field>
                <Field label="رقم التواصل الخاص بالمتجر">
                  <input className="input" type="tel" dir="ltr"
                    value={form.contactPhone}
                    onChange={(e) => update('contactPhone', e.target.value)} />
                </Field>
                <Field label="البريد الإلكتروني">
                  <input className="input" type="email" dir="ltr"
                    value={form.contactEmail}
                    onChange={(e) => update('contactEmail', e.target.value)} />
                </Field>
              </div>

              <Field label="العنوان التفصيلي للمتجر" required>
                <textarea className="input min-h-24" required maxLength={255}
                  value={form.addressText}
                  onChange={(e) => update('addressText', e.target.value)} />
              </Field>

              <div className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--bg-elevated)' }}>
                <div className="font-black">📍 موقع المتجر الجغرافي</div>
                <button type="button" className="btn btn-primary"
                  onClick={getLocation}>
                  تحديد موقعي الحالي
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="خط العرض">
                    <input className="input" dir="ltr" readOnly
                      value={form.latitude} placeholder="Latitude" />
                  </Field>
                  <Field label="خط الطول">
                    <input className="input" dir="ltr" readOnly
                      value={form.longitude} placeholder="Longitude" />
                  </Field>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  يجب السماح للمتصفح بالوصول إلى موقعك أثناء وجودك في المتجر.
                </p>
              </div>

              <button type="submit" disabled={loading}
                className="btn btn-primary btn-lg w-full">
                {loading ? '⏳ جارٍ إرسال الطلب...' : 'إرسال طلب تسجيل المتجر'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6 space-y-3 text-sm">
          <p><Link className="text-blue-400 font-bold" href="/login">
            لديك حساب متجر؟ تسجيل الدخول
          </Link></p>
          <p><Link className="text-blue-400" href="/application-status">
            متابعة طلب سابق
          </Link></p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-bold mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}
