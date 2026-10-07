'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin === '1234') { localStorage.setItem('admin_logged_in', 'true'); router.push('/dashboard') }
    else { setError('رمز خاطئ. جرب: 1234') }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 p-6" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary-600 flex items-center justify-center"><span className="text-white text-4xl">⚙️</span></div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة الإدارة</h1>
          <p className="text-gray-500 mt-2">أدخل رمز الدخول</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رمز الدخول</label>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" maxLength={4} required className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none text-center text-2xl tracking-widest" dir="ltr" />
          </div>
          <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition">دخول</button>
          {error && <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-xl">{error}</p>}
        </form>
        <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl"><p className="text-xs text-yellow-800 text-center">⚠️ للتطوير: الرمز هو 1234</p></div>
      </div>
    </main>
  )
}
