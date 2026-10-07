'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAvailableOrders, acceptOrder } from '@/lib/hooks/useDriverOrders'
import { formatPrice } from '@/lib/utils/pricing'
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS } from '@/lib/types/order'
import BottomNav from '@/components/BottomNav'
export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const { orders, loading } = useAvailableOrders(8000)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('driver_logged_in')) { router.push('/login'); return }
    setUser({ name: localStorage.getItem('driver_name') || 'مندوب', phone: localStorage.getItem('driver_phone') || '' })
    setIsOnline(localStorage.getItem('driver_online') === 'true')
  }, [router])
  function toggleOnline() {
    const next = !isOnline
    setIsOnline(next)
    localStorage.setItem('driver_online', next ? 'true' : 'false')
  }
  async function handleAccept(orderId: string) {
    setAccepting(orderId)
    try {
      const driverId = localStorage.getItem('driver_id') || 'driver-unknown'
      await acceptOrder(orderId, driverId)
      router.push(`/orders/${orderId}`)
    } catch { alert('حدث خطأ') } finally { setAccepting(null) }
  }
  if (!user) return null
  return (
    <main className="min-h-screen bg-gray-50 pb-24 relative" dir="rtl">
      <header className="bg-primary-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div><p className="text-sm opacity-80">مرحباً</p><h1 className="text-xl font-bold">{user.name}</h1></div>
          <button onClick={toggleOnline} className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${isOnline ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}>{isOnline ? '🟢 متصل' : '⚪ غير متصل'}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur"><p className="text-2xl font-bold">{orders.length}</p><p className="text-xs opacity-80">طلبات متاحة</p></div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur"><p className="text-2xl font-bold">{formatPrice(parseFloat(localStorage.getItem('driver_wallet') || '0'))}</p><p className="text-xs opacity-80">رصيد المحفظة</p></div>
        </div>
      </header>
      <section className="p-6">
        {!isOnline ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
            <div className="text-6xl mb-4">😴</div>
            <h3 className="font-bold text-gray-900 mb-2">أنت غير متصل</h3>
            <p className="text-sm text-gray-500 mb-4">فعّل الاتصال لاستقبال الطلبات</p>
            <button onClick={toggleOnline} className="px-6 py-3 bg-green-500 text-white rounded-2xl font-semibold">🟢 تفعيل الاتصال</button>
          </div>
        ) : loading ? (
          <div className="text-center py-12"><p className="text-gray-500">جاري التحميل...</p></div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-bold text-gray-900 mb-2">لا توجد طلبات حالياً</h3>
            <p className="text-sm text-gray-500">سيتم إشعارك عند وصول طلبات جديدة</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 mb-3">📦 طلبات متاحة ({orders.length})</h2>
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl">{ORDER_TYPE_ICONS[order.order_type]}</div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{ORDER_TYPE_LABELS[order.order_type]}</p>
                    <p className="text-xs text-gray-500">{order.distance_km} كم · {formatPrice(order.total_price)}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm"><span className="text-green-600">●</span><span className="text-gray-700 line-clamp-1">{order.pickup_address}</span></div>
                  <div className="flex items-start gap-2 text-sm"><span className="text-red-600">●</span><span className="text-gray-700 line-clamp-1">{order.dropoff_address}</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/orders/${order.id}`)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition">تفاصيل</button>
                  <button onClick={() => handleAccept(order.id)} disabled={accepting === order.id} className="flex-1 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">{accepting === order.id ? 'جاري...' : '✓ قبول'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  )
}
