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
    <main className="min-h-screen bg-gray-50 pb-24 relative" dir="rtl">
      <header className="bg-primary-600 text-white p-8 rounded-b-3xl shadow-lg">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center text-5xl">🛵</div>
          <h1 className="text-xl font-bold">{data.name}</h1>
          <p className="text-sm opacity-80 mt-1" dir="ltr">{data.phone}</p>
        </div>
      </header>
      <section className="p-6 -mt-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between"><span className="text-gray-500">المركبة</span><span className="font-semibold">{VEHICLES[data.vehicle] || data.vehicle}</span></div>
          <div className="p-4 border-b border-gray-100 flex justify-between"><span className="text-gray-500">رقم اللوحة</span><span className="font-semibold">{data.plate}</span></div>
          <div className="p-4 flex justify-between"><span className="text-gray-500">رقم الرخصة</span><span className="font-semibold">{data.license}</span></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <a href="/support" className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100"><span className="font-medium">💬 الدعم الفني</span><span className="text-gray-300">←</span></a>
          <a href="#" className="flex items-center justify-between p-4 hover:bg-gray-50"><span className="font-medium">📄 الشروط والأحكام</span><span className="text-gray-300">←</span></a>
        </div>
        <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 transition">تسجيل الخروج</button>
        <p className="text-center text-xs text-gray-400 pt-4">أبشر بي - مندوب v1.0.0</p>
      </section>
      <BottomNav />
    </main>
  )
}
