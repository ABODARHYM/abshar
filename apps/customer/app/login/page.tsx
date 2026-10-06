'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await new Promise((r) => setTimeout(r, 1000))
      setMessage('سيتم إرسال رمز التحقق إلى: ' + phone)
    } catch (err) {
      setMessage('حدث خطأ، حاول مرة أخرى')
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
          <p className="text-gray-500 mt-2">أدخل رقم جوالك لاستلام رمز التحقق</p>
        </div>

        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+967 7XX XXX XXX"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none text-lg"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
          </button>

          {message && (
            <p className="text-center text-sm text-primary-600 bg-primary-50 py-3 rounded-xl">
              {message}
            </p>
          )}
        </form>

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
