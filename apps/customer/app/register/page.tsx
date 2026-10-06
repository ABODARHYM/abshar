'use client'

import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد (اختياري)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>

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
