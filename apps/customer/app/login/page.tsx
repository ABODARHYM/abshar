'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formattedPhone = phone.startsWith('+')
      ? phone
      : '+967' + phone.replace(/^0/, '')

    try {
      // حفظ الرقم في localStorage كوضع تجريبي
      if (typeof window !== 'undefined') {
        localStorage.setItem('abshar_phone', formattedPhone)
        localStorage.setItem('abshar_logged_in', 'true')
      }

      // انتقل إلى dashboard
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">أ</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-500 mt-2">أدخل رقم جوالك للدخول مباشرة</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال
            </label>
            <div className="flex" dir="ltr">
              <span className="inline-flex items-center px-4 rounded-l-2xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 font-medium">
                +967
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="7XX XXX XXX"
                required
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-2xl focus:border-primary-500 focus:outline-none text-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 9}
            className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          {error && (
            <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-xl">
              {error}
            </p>
          )}
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
          <p className="text-xs text-yellow-800 text-center">
            ⚠️ وضع التطوير: الدخول بدون تحقق
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          ليس لديك حساب؟{' '}
          <a href="/register" className="text-primary-600 font-semibold">
            إنشاء حساب
          </a>
        </p>
      </div>
    </main>
  )
}
