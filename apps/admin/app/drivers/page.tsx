'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
interface Driver {
  id: string; user_id: string; vehicle_type: string; vehicle_plate: string
  is_online: boolean; is_verified: boolean; rating_avg: number
  total_orders: number; wallet_balance: number
}
const vehicleLabels: Record<string, string> = {
  motorcycle: '🏍️ دراجة', car: '🚗 سيارة', van: '🚐 فان', truck: '🚚 شاحنة',
}
export default function DriversPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
    const supabase = createClient()
    supabase.from('drivers').select('*').order('created_at', { ascending: false }).then(({ data }) => { setDrivers((data || []) as Driver[]); setLoading(false) })
  }, [router])
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6"><h1 className="text-3xl font-bold text-gray-900">المندوبون</h1><p className="text-gray-500 mt-1">{drivers.length} مندوب مسجل</p></header>
        {loading ? <div className="text-center py-12"><p className="text-gray-500">جاري التحميل...</p></div> : drivers.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center"><div className="text-6xl mb-4">🛵</div><h3 className="font-bold text-gray-900 mb-2">لا يوجد مندوبون بعد</h3><p className="text-sm text-gray-500">سيسجلون من تطبيق المندوب</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl">{vehicleLabels[driver.vehicle_type]?.split(' ')[0] || '🛵'}</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${driver.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{driver.is_online ? '🟢 متصل' : '⚪ غير متصل'}</span>
                </div>
                <p className="font-mono text-sm text-gray-500 mb-1" dir="ltr">{driver.id.slice(0, 8)}...</p>
                <p className="font-semibold text-gray-900 mb-3">{vehicleLabels[driver.vehicle_type] || driver.vehicle_type}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">اللوحة</span><span className="font-semibold">{driver.vehicle_plate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">التقييم</span><span className="font-semibold">⭐ {driver.rating_avg.toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">الطلبات</span><span className="font-semibold">{driver.total_orders}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">المحفظة</span><span className="font-semibold text-primary-600">{driver.wallet_balance.toLocaleString()} ر.ي</span></div>
                </div>
                {!driver.is_verified && <button className="w-full mt-4 py-2 bg-green-50 text-green-600 rounded-xl font-semibold hover:bg-green-100 text-sm">✓ توثيق المندوب</button>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
