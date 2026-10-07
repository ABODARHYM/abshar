'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

const VEHICLES: Record<string, string> = {
  motorcycle: '🏍️ دراجة نارية',
  car: '🚗 سيارة',
  van: '🚐 فان',
  truck: '🚚 شاحنة',
}

export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setData({
        name: profile?.full_name || 'مندوب',
        phone: profile?.phone || '',
        vehicle: driver?.vehicle_type || 'motorcycle',
        plate: driver?.vehicle_plate || '',
        license: driver?.license_number || '',
        rating: Number(driver?.rating_avg || 5).toFixed(1),
        totalOrders: driver?.total_orders || 0,
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

  if (!data) return null

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white p-10 rounded-b-4xl shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative text-center">
          <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-6xl border-4 border-white/30">
            🛵
          </div>
          <h1 className="text-2xl font-black">{data.name}</h1>
          <p className="text-sm opacity-90 mt-1 font-bold" dir="ltr">{data.phone}</p>
          <div className="flex justify-center gap-6 mt-5">
            <div className="text-center">
              <p className="text-2xl font-black">{data.rating}</p>
              <p className="text-xs opacity-80 font-bold">⭐ التقييم</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{data.totalOrders}</p>
              <p className="text-xs opacity-80 font-bold">📦 الطلبات</p>
            </div>
          </div>
        </div>
      </header>

      <section className="p-6 -mt-8 space-y-4">
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between">
            <span className="text-gray-500 font-bold">🚗 المركبة</span>
            <span className="font-black">{VEHICLES[data.vehicle] || data.vehicle}</span>
          </div>
          <div className="p-5 border-b border-gray-100 flex justify-between">
            <span className="text-gray-500 font-bold">🔢 اللوحة</span>
            <span className="font-black">{data.plate}</span>
          </div>
          <div className="p-5 flex justify-between">
            <span className="text-gray-500 font-bold">📄 الرخصة</span>
            <span className="font-black">{data.license}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <a href="/support" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition">
            <span className="font-black">💬 الدعم الفني</span>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
            <span className="font-black">📄 الشروط والأحكام</span>
            <span className="text-gray-300 text-2xl">←</span>
          </a>
        </div>

        <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black text-lg hover:bg-red-100 transition border-2 border-red-100">
          🚪 تسجيل الخروج
        </button>

        <p className="text-center text-xs text-gray-400 pt-4 font-semibold">أبشر بي - مندوب v1.0.0</p>
      </section>

      <BottomNav />
    </main>
  )
}
