'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formattedPhone = form.phone.startsWith('+')
      ? form.phone
      : '+967' + form.phone.replace(/^0/, '')

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('abshar_phone', formattedPhone)
        localStorage.setItem('abshar_name', form.name)
        localStorage.setItem('abshar_logged_in', 'true')
      }

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
          <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب</h1>
          <p className="text-gray-500 mt-2">انضم إلى أبشر بي في دقيقة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
            <div className="flex" dir="ltr">
              <span className="inline-flex items-center px-4 rounded-l-2xl border-2 border-r-0 border-gray-200 bg-gray-50 text-gray-600 font-medium">
                +967
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="7XX XXX XXX"
                required
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-r-2xl focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || form.phone.length < 9}
            className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
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
          لديك حساب بالفعل؟{' '}
          <a href="/login" className="text-primary-600 font-semibold">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  )
}
