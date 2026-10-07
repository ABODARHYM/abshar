'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', authUser.id)
        .single()

      setUser({
        name: profile?.full_name || 'مستخدم',
        phone: profile?.phone || '',
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft" dir="rtl">
        <div className="w-20 h-20 rounded-4xl bg-gradient-primary animate-pulse-glow" />
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white p-10 rounded-b-4xl shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative text-center">
          <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-6xl border-4 border-white/30">
            👤
          </div>
          <h1 className="text-2xl font-black">{user.name}</h1>
          <p className="text-sm opacity-90 mt-1 font-bold" dir="ltr">{user.phone}</p>
        </div>
      </header>

      <section className="p-6 -mt-8 space-y-4">
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <a href="/orders" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">📋</div>
              <span className="font-black text-gray-800">طلباتي</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl">📍</div>
              <span className="font-black text-gray-800">عناويني المحفوظة</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl">💳</div>
              <span className="font-black text-gray-800">طرق الدفع</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
        </div>

        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <a href="/support" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-2xl">💬</div>
              <span className="font-black text-gray-800">الدعم الفني</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">📄</div>
              <span className="font-black text-gray-800">الشروط والأحكام</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-2xl">ℹ️</div>
              <span className="font-black text-gray-800">عن التطبيق</span>
            </div>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
        </div>

        <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black text-lg hover:bg-red-100 transition border-2 border-red-100">
          🚪 تسجيل الخروج
        </button>

        <p className="text-center text-xs text-gray-400 pt-4 font-semibold">أبشر بي v1.0.0 · © 2026 أسرار الرقمية</p>
      </section>

      <BottomNav />
    </main>
  )
}
