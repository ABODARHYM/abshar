
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (input: string): string => {
    // إزالة كل شيء غير الأرقام
    let digits = input.replace(/\D/g, '');

    // إزالة الصفر في البداية إن وُجد
    if (digits.startsWith('0')) digits = digits.substring(1);

    // إذا بدأ بـ 967، احتفظ به
    if (digits.startsWith('967') && digits.length > 9) {
      return '+' + digits;
    }

    // إذا بدأ بـ 7 وأطواله 9 (777XXXXXX)
    if (digits.startsWith('7') && digits.length === 9) {
      return '+967' + digits;
    }

    // الحالة الافتراضية — أضف +967
    return '+967' + digits;
  };

  const isValidPhone = (input: string): boolean => {
    const digits = input.replace(/\D/g, '');
    return digits.length >= 9 && /^7\d{8}$/.test(digits.replace(/^967/, '').replace(/^0/, ''));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('الاسم يجب أن يكون حرفين على الأقل');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('رقم الهاتف غير صحيح. الصيغة: 7XX XXX XXX');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);

    const normalizedPhone = normalizePhone(phone);

    // بريد وهمي فريد مشتق من الرقم
    const digits = normalizedPhone.replace(/\D/g, '');
    const fakeEmail = `${digits}@absher-bi.local`;

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: fakeEmail,
          phone: normalizedPhone,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // رسائل خطأ ودّية بالعربية
        const msg = data.message || '';
        if (msg.includes('phone') || msg.includes('Phone')) {
          setError('هذا الرقم مسجّل مسبقاً. سجّل دخولك');
        } else if (msg.includes('email') || msg.includes('Email')) {
          setError('هذا الرقم مستخدم بالفعل. جرّب رقم آخر');
        } else {
          setError(msg || 'فشل إنشاء الحساب');
        }
        setLoading(false);
        return;
      }

      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/');
    } catch {
      setError('خطأ في الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 py-10 relative overflow-hidden"
      style={{ background: 'var(--gradient-hero)' }}
    >
      {/* Decorations */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-red-500 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-amber-400 rounded-full blur-3xl animate-float delay-500" />
      </div>

      <div className="relative w-full max-w-md animate-fade">
        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-red-dark)] flex items-center justify-center shadow-lg shadow-red-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-right">
              <div className="font-black text-xl text-white">ABSHER BI</div>
              <div className="text-[10px] text-[var(--brand-red-light)]">أبشر بي</div>
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">انضم إلينا مجاناً</h1>
          <p className="text-sm text-[var(--text-muted)]">
            🎁 احصل على <span className="text-[var(--brand-gold)] font-bold">100 نقطة</span> ترحيبية
          </p>
        </div>

        {/* Card */}
        <div className="card animate-fade delay-100">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold mb-2">
                الاسم الكامل <span className="text-[var(--brand-red-light)]">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد أحمد"
                required
                autoComplete="name"
                className="input"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold mb-2">
                رقم الهاتف <span className="text-[var(--brand-red-light)]">*</span>
              </label>
              <div className="relative" dir="ltr">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm font-bold text-[var(--brand-gold)] border-r border-[var(--bg-border)] pr-3">
                    🇾🇪 +967
                  </span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    // اسمح فقط بالأرقام والمسافات
                    const v = e.target.value.replace(/[^\d\s]/g, '');
                    setPhone(v);
                  }}
                  placeholder="7XX XXX XXX"
                  required
                  autoComplete="tel"
                  className="input pl-24 text-left font-bold tracking-wider"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                مثال: 777 123 456
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold mb-2">
                كلمة المرور <span className="text-[var(--brand-red-light)]">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
                dir="ltr"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                8 أحرف على الأقل
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg btn-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  جاري التسجيل...
                </>
              ) : (
                <>✨ إنشاء الحساب</>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="font-bold text-[var(--brand-red-light)] hover:text-[var(--brand-red)]">
                سجّل دخولك
              </Link>
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6 leading-relaxed">
          بالتسجيل أنت توافق على{' '}
          <Link href="/profile/privacy" className="text-[var(--brand-red-light)] font-bold">
            الشروط والأحكام
          </Link>
        </p>
      </div>
    </div>
  );
}
