'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formattedPhone = form.phone.startsWith('+') ? form.phone : '+967' + form.phone.replace(/^0/, '')

    try {
      const supabase = createClient()

      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', formattedPhone)
        .maybeSingle()

      let userId: string

      if (existing) {
        userId = existing.id
        await supabase.from('profiles').update({
          full_name: form.name,
          role: 'customer',
          is_active: true,
        }).eq('id', userId)
      } else {
        const newId = crypto.randomUUID()
        const { error: insertError } = await supabase.from('profiles').insert({
          id: newId,
          full_name: form.name,
          phone: formattedPhone,
          role: 'customer',
          is_active: true,
        })

        if (insertError) throw insertError
        userId = newId
      }

      localStorage.setItem('abshar_user_id', userId)
      localStorage.setItem('abshar_name', form.name)
      localStorage.setItem('abshar_phone', formattedPhone)
      localStorage.setItem('abshar_logged_in', 'true')

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-white" dir="rtl">
      <div className="absolute top-[-15%] left-[-15%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-[-15%] right-[-15%] w-96 h-96 bg-primary-300 rounded-full blur-3xl opacity-30" />
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-4xl bg-gradient-primary flex items-center justify-center shadow-primary">
              <span className="text-white text-5xl font-black">أ</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">حساب جديد</h1>
            <p className="text-gray-500 font-semibold">انضم إلى أبشر بي في دقيقة</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">👤 الاسم الكامل</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} placeholder="مثال: أحمد علي" className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">📱 رقم الجوال</label>
              <div className="flex bg-gray-50 rounded-3xl p-2 border-2 border-transparent focus-within:border-primary-300" dir="ltr">
                <span className="inline-flex items-center px-4 text-primary-600 font-black text-lg">+967</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="7XX XXX XXX" required className="flex-1 px-4 py-4 bg-transparent focus:outline-none text-lg font-bold" />
              </div>
            </div>
            <button type="submit" disabled={loading || form.phone.length < 9 || form.name.length < 3} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
              {loading ? '⏳ جاري الإنشاء...' : '✨ إنشاء الحساب'}
            </button>
            {error && <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-2xl font-bold">{error}</p>}
          </form>
          <p className="text-center text-sm text-gray-500 mt-8 font-semibold">لديك حساب؟ <a href="/login" className="text-primary-600 font-black hover:underline">تسجيل الدخول</a></p>
        </div>
      </div>
    </main>
  )
}
