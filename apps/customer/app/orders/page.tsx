'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserOrders } from '@/lib/hooks/useOrders'
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

    const isLoggedIn = localStorage.getItem('abshar_logged_in')
    const phone = localStorage.getItem('abshar_phone')

    if (!isLoggedIn || !phone) {
      router.push('/login')
      return
    }

    // وضع التطوير: نستخدم رقم الجوال كـ customer_id مؤقتاً
    // TODO: استبدال بـ user.id الحقيقي بعد تفعيل Auth
    const customerId = phone

    getUserOrders(customerId)
      .then((data) => {
        setOrders(data)
        setLoading(false)
      })
      .catch(() => {
        setOrders([])
        setLoading(false)
      })
  }, [router])

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  )
  const pastOrders = orders.filter((o) =>
    ['delivered', 'cancelled'].includes(o.status)
  )

  const displayed = filter === 'active' ? activeOrders : pastOrders

  return (
    <main className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-40">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">طلباتي</h1>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 py-2 rounded-xl font-semibold transition ${
              filter === 'active'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            النشطة ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`flex-1 py-2 rounded-xl font-semibold transition ${
              filter === 'past'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            السابقة ({pastOrders.length})
          </button>
        </div>
      </header>

      <section className="p-6 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="font-bold text-gray-900 mb-2">
              {filter === 'active' ? 'لا توجد طلبات نشطة' : 'لا توجد طلبات سابقة'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {filter === 'active'
                ? 'ابدأ بطلب توصيل جديد'
                : 'طلباتك السابقة ستظهر هنا'}
            </p>
            {filter === 'active' && (
              <a
                href="/orders/new"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold hover:bg-primary-700 transition"
              >
                طلب جديد
              </a>
            )}
          </div>
        ) : (
          displayed.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </section>

      <BottomNav />
    </main>
  )
}
