'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formattedPhone = phone.startsWith('+') ? phone : '+967' + phone.replace(/^0/, '')
    const fakeEmail = formattedPhone.replace('+', '') + '@abshar.local'
    const fakePassword = 'abshar-dev-' + formattedPhone.replace('+', '')

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: fakePassword,
      })

      if (error) throw error

      if (data.user) {
        localStorage.setItem('abshar_user_id', data.user.id)
        localStorage.setItem('abshar_phone', formattedPhone)
        localStorage.setItem('abshar_logged_in', 'true')

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single()

        if (profile?.full_name) {
          localStorage.setItem('abshar_name', profile.full_name)
        }
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('الحساب غير موجود. أنشئ حساباً جديداً.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white" dir="rtl">
      <div className="absolute top-[-15%] right-[-15%] w-96 h-96 bg-primary-300 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-[-15%] left-[-15%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-4xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <span className="text-white text-5xl font-black">أ</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">مرحباً بك 👋</h1>
            <p className="text-gray-500 font-semibold">أدخل رقم جوالك للدخول</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">📱 رقم الجوال</label>
              <div className="flex bg-gray-50 rounded-3xl p-2 border-2 border-transparent focus-within:border-primary-300" dir="ltr">
                <span className="inline-flex items-center px-4 text-primary-600 font-black text-lg">+967</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XX XXX XXX" required className="flex-1 px-4 py-4 bg-transparent focus:outline-none text-lg font-bold" />
              </div>
            </div>
            <button type="submit" disabled={loading || phone.length < 9} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
              {loading ? '⏳ جاري الدخول...' : '🚀 دخول'}
            </button>
            {error && <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-2xl font-bold">{error}</p>}
          </form>
          <p className="text-center text-sm text-gray-500 mt-8 font-semibold">ليس لديك حساب؟ <a href="/register" className="text-primary-600 font-black hover:underline">إنشاء حساب</a></p>
        </div>
      </div>
    </main>
  )
}
