'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
const VEHICLES: Record<string, string> = { motorcycle: '🏍️ دراجة نارية', car: '🚗 سيارة', van: '🚐 فان', truck: '🚚 شاحنة' }
export default function ProfilePage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('driver_logged_in')) { router.push('/login'); return }
    setData({
      name: localStorage.getItem('driver_name') || 'مندوب',
      phone: localStorage.getItem('driver_phone') || '',
      vehicle: localStorage.getItem('driver_vehicle') || 'motorcycle',
      plate: localStorage.getItem('driver_plate') || '',
      license: localStorage.getItem('driver_license') || '',
    })
  }, [router])
  function handleLogout() { localStorage.clear(); router.push('/login') }
  if (!data) return null
  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white p-10 rounded-b-4xl shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative text-center">
          <div className="w-28 h-28 mx-auto mb-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-6xl border-4 border-white/30">🛵</div>
          <h1 className="text-2xl font-black">{data.name}</h1>
          <p className="text-sm opacity-90 mt-1 font-bold" dir="ltr">{data.phone}</p>
        </div>
      </header>
      <section className="p-6 -mt-8 space-y-4">
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between"><span className="text-gray-500 font-bold">🚗 المركبة</span><span className="font-black">{VEHICLES[data.vehicle] || data.vehicle}</span></div>
          <div className="p-5 border-b border-gray-100 flex justify-between"><span className="text-gray-500 font-bold">🔢 اللوحة</span><span className="font-black">{data.plate}</span></div>
          <div className="p-5 flex justify-between"><span className="text-gray-500 font-bold">📄 الرخصة</span><span className="font-black">{data.license}</span></div>
        </div>
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <a href="/support" className="flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-100 transition"><span className="font-black">💬 الدعم الفني</span><span className="text-gray-300 text-2xl">←</span></a>
          <a href="#" className="flex items-center justify-between p-5 hover:bg-gray-50 transition"><span className="font-black">📄 الشروط والأحكام</span><span className="text-gray-300 text-2xl">←</span></a>
        </div>
        <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-600 rounded-3xl font-black text-lg hover:bg-red-100 transition border-2 border-red-100">🚪 تسجيل الخروج</button>
        <p className="text-center text-xs text-gray-400 pt-4 font-semibold">أبشر بي - مندوب v1.0.0</p>
      </section>
      <BottomNav />
    </main>
  )
}
