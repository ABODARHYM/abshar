'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDriverOrders } from '@/lib/hooks/useDriverOrders'
import type { Order } from '@/lib/types/order'
import OrderCard from '@/components/OrderCard'
import BottomNav from '@/components/BottomNav'
export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'past'>('active')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('driver_logged_in')) { router.push('/login'); return }
    const driverId = localStorage.getItem('driver_id') || ''
    getDriverOrders(driverId).then((data) => { setOrders(data); setLoading(false) }).catch(() => setLoading(false))
  }, [router])
  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const past = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status))
  const displayed = filter === 'active' ? active : past
  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="bg-white/80 backdrop-blur-xl p-6 shadow-soft sticky top-0 z-40 rounded-b-4xl border-b border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 mb-5">📋 طلباتي</h1>
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-3xl">
          <button onClick={() => setFilter('active')} className={`flex-1 py-3 rounded-2xl font-black transition-all duration-300 ${filter === 'active' ? 'bg-gradient-primary text-white shadow-primary' : 'text-gray-500'}`}>النشطة ({active.length})</button>
          <button onClick={() => setFilter('past')} className={`flex-1 py-3 rounded-2xl font-black transition-all duration-300 ${filter === 'past' ? 'bg-gradient-primary text-white shadow-primary' : 'text-gray-500'}`}>المكتملة ({past.length})</button>
        </div>
      </header>
      <section className="p-6 space-y-4">
        {loading ? <div className="text-center py-20"><div className="w-20 h-20 mx-auto rounded-4xl bg-gradient-primary animate-pulse-glow" /></div>
        : displayed.length === 0 ? <div className="bg-white p-12 rounded-3xl text-center shadow-soft"><div className="text-7xl mb-5">📭</div><h3 className="font-black text-gray-900 text-xl">{filter === 'active' ? 'لا توجد طلبات نشطة' : 'لا توجد طلبات مكتملة'}</h3></div>
        : displayed.map((order) => <OrderCard key={order.id} order={order} />)}
      </section>
      <BottomNav />
    </main>
  )
}
