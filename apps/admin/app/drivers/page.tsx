'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAllDrivers } from '@/lib/hooks/useAdminData'
import Sidebar from '@/components/Sidebar'

const vehicleLabels: Record<string, string> = {
  motorcycle: '🏍️ دراجة نارية',
  car: '🚗 سيارة',
  van: '🚐 فان',
  truck: '🚚 شاحنة',
}

export default function DriversPage() {
  const router = useRouter()
  const { drivers, loading } = useAllDrivers()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6">
          <h1 className="text-4xl font-black text-gray-900">🛵 المندوبون</h1>
          <p className="text-gray-500 mt-2 font-semibold">{drivers.length} مندوب مسجل</p>
        </header>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-4xl bg-gradient-primary animate-pulse-glow" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-soft">
            <div className="text-7xl mb-4">🛵</div>
            <h3 className="font-black text-gray-900 mb-2 text-xl">لا يوجد مندوبون بعد</h3>
            <p className="text-sm text-gray-500 font-semibold">سيسجلون من تطبيق المندوب</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white p-6 rounded-3xl shadow-soft hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-soft flex items-center justify-center text-3xl border border-primary-100">
                    {vehicleLabels[driver.vehicle_type]?.split(' ')[0] || '🛵'}
                  </div>
                  <span className={`px-3 py-1.5 rounded-2xl text-xs font-black ${driver.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {driver.is_online ? '🟢 متصل' : '⚪ غير متصل'}
                  </span>
                </div>
                <p className="font-mono text-xs text-gray-500 mb-2 font-semibold" dir="ltr">
                  {driver.id.slice(0, 8)}...
                </p>
                <p className="font-black text-gray-900 mb-4 text-lg">
                  {vehicleLabels[driver.vehicle_type] || driver.vehicle_type}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-2xl">
                    <span className="text-gray-500 font-bold">🔢 اللوحة</span>
                    <span className="font-black">{driver.vehicle_plate}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-2xl">
                    <span className="text-gray-500 font-bold">⭐ التقييم</span>
                    <span className="font-black">{Number(driver.rating_avg).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-2xl">
                    <span className="text-gray-500 font-bold">📦 الطلبات</span>
                    <span className="font-black">{driver.total_orders}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gradient-soft rounded-2xl border border-primary-100">
                    <span className="text-gray-500 font-bold">💰 المحفظة</span>
                    <span className="font-black text-primary-600">
                      {Number(driver.wallet_balance).toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>
                {!driver.is_verified && (
                  <button className="w-full mt-5 py-3 bg-green-50 text-green-600 rounded-2xl font-black hover:bg-green-100 border-2 border-green-100 text-sm transition">
                    ✓ توثيق المندوب
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
