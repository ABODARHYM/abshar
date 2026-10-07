'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/pricing'
import StatusBadge from '@/components/StatusBadge'
import { ORDER_TYPE_LABELS, ORDER_TYPE_ICONS, ORDER_STATUS_LABELS, type OrderStatus, type Order } from '@/lib/types/order'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const statusSteps: OrderStatus[] = ['pending', 'accepted', 'heading_to_pickup', 'picked_up', 'on_the_way', 'delivered']

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()

    supabase.from('orders').select('*').eq('id', id).single()
      .then(({ data }) => {
        setOrder(data as Order)
        setLoading(false)
      })

    const channel = supabase
      .channel(`customer-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft" dir="rtl">
        <div className="w-20 h-20 rounded-4xl bg-gradient-primary animate-pulse-glow" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <div className="text-7xl mb-4">❌</div>
          <h2 className="font-black text-gray-900 mb-2 text-xl">لم يتم العثور على الطلب</h2>
          <button onClick={() => router.push('/orders')} className="mt-6 px-8 py-4 bg-gradient-primary text-white rounded-3xl font-black shadow-primary">
            العودة للطلبات
          </button>
        </div>
      </div>
    )
  }

  const currentStepIndex = statusSteps.indexOf(order.status)

  return (
    <main className="min-h-screen bg-gray-50 pb-8 relative" dir="rtl">
      <header className="bg-white/80 backdrop-blur-xl p-6 shadow-soft sticky top-0 z-50 rounded-b-4xl border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-xl font-black">→</button>
          <div className="flex-1">
            <h1 className="font-black text-gray-900">تفاصيل الطلب</h1>
            <p className="text-xs text-gray-500 font-mono font-semibold" dir="ltr">{order.order_number}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <section className="p-6">
        <Map pickup={[order.pickup_lat, order.pickup_lng]} dropoff={[order.dropoff_lat, order.dropoff_lng]} mode="view" height="280px" />
      </section>

      {order.status !== 'cancelled' && (
        <section className="px-6 mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-soft">
            <h3 className="font-black text-gray-900 mb-5 text-lg">📊 حالة الطلب</h3>
            <div className="space-y-4">
              {statusSteps.map((status, index) => {
                const isDone = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${isDone ? 'bg-gradient-primary text-white shadow-primary' : 'bg-gray-200 text-gray-400'} ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}`}>
                      {isDone ? '✓' : index + 1}
                    </div>
                    <p className={`text-sm font-bold ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {ORDER_STATUS_LABELS[status]}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-3xl bg-gradient-soft flex items-center justify-center text-3xl border border-primary-100">
              {ORDER_TYPE_ICONS[order.order_type]}
            </div>
            <div className="pt-1">
              <p className="text-xs text-gray-500 font-bold">نوع الطلب</p>
              <p className="font-black text-lg">{ORDER_TYPE_LABELS[order.order_type]}</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-500 mb-2 font-bold">📍 الاستلام</p>
            <p className="font-bold text-gray-800">{order.pickup_address}</p>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-500 mb-2 font-bold">🎯 التسليم</p>
            <p className="font-bold text-gray-800">{order.dropoff_address}</p>
          </div>
          {order.notes && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-500 mb-2 font-bold">📝 ملاحظات</p>
              <p className="text-sm text-gray-700 font-semibold">{order.notes}</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 mb-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft">
          <h3 className="font-black text-gray-900 mb-5 text-lg">💰 تفاصيل السعر</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">المسافة</span>
              <span className="font-black">{order.distance_km} كم</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">السعر الأساسي</span>
              <span className="font-black">{formatPrice(order.base_fare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-bold">أجرة المسافة</span>
              <span className="font-black">{formatPrice(order.distance_fare)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <span className="font-black text-lg">الإجمالي</span>
              <span className="font-black text-primary-600 text-2xl">{formatPrice(order.total_price)}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
