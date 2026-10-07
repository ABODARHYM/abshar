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
    <main className="min-h-screen relative overflow-hidden bg-gradient-primary flex items-center justify-center p-6" dir="rtl">
      <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-[-20%] left-[-20%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-4xl shadow-2xl p-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-4xl bg-gradient-primary flex items-center justify-center shadow-primary"><span className="text-white text-5xl">⚙️</span></div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">لوحة الإدارة</h1>
          <p className="text-gray-500 font-semibold">أدخل رمز الدخول</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">🔐 رمز الدخول</label>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" maxLength={4} required className="w-full px-5 py-5 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 text-center text-3xl font-black tracking-[1em] border-2 border-transparent focus:border-primary-300" dir="ltr" />
          </div>
          <button type="submit" className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300">🚀 دخول</button>
          {error && <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-2xl font-bold">{error}</p>}
        </form>
        <div className="mt-6 p-4 bg-gradient-soft border-2 border-primary-100 rounded-2xl"><p className="text-xs text-primary-700 text-center font-bold">⚡ للتطوير: الرمز هو 1234</p></div>
      </div>
    </main>
  )
}
