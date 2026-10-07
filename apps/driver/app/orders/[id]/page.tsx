'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/pricing'
import StatusBadge from '@/components/StatusBadge'
import type { Order, OrderStatus } from '@/lib/types/order'
import { ORDER_TYPE_LABELS, ORDER_TYPE_ICONS } from '@/lib/types/order'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const nextStatus: Partial<Record<OrderStatus, { to: OrderStatus; label: string; color: string }>> = {
  accepted: { to: 'heading_to_pickup', label: '🛵 بدء التوجه للاستلام', color: 'bg-indigo-600' },
  heading_to_pickup: { to: 'picked_up', label: '✓ تم الاستلام', color: 'bg-purple-600' },
  picked_up: { to: 'on_the_way', label: '🚀 بدء التوصيل', color: 'bg-cyan-600' },
  on_the_way: { to: 'delivered', label: '✅ تم التسليم', color: 'bg-green-600' },
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()

    supabase.from('orders').select('*').eq('id', id).single()
      .then(({ data }) => {
        setOrder(data as Order)
        setLoading(false)
      })

    const channel = supabase
      .channel(`driver-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        setOrder(payload.new as Order)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function handleNext() {
    if (!order) return
    const next = nextStatus[order.status]
    if (!next) return

    setUpdating(true)
    try {
      const supabase = createClient()
      const update: any = { status: next.to }
      if (next.to === 'delivered') update.delivered_at = new Date().toISOString()

      const { error } = await supabase.from('orders').update(update).eq('id', order.id)
      if (error) throw error

      if (next.to === 'delivered') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: driver } = await supabase
            .from('drivers')
            .select('id, wallet_balance, total_orders')
            .eq('user_id', user.id)
            .single()

          if (driver) {
            await supabase.from('drivers').update({
              wallet_balance: Number(driver.wallet_balance) + Number(order.total_price),
              total_orders: (driver.total_orders || 0) + 1,
            }).eq('id', driver.id)
          }
        }
      }
    } catch (err) {
      alert('حدث خطأ')
    } finally {
      setUpdating(false)
    }
  }

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
            العودة
          </button>
        </div>
      </div>
    )
  }

  const next = nextStatus[order.status]

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
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
        <Map pickup={[order.pickup_lat, order.pickup_lng]} dropoff={[order.dropoff_lat, order.dropoff_lng]} height="280px" />
      </section>

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
        </div>
      </section>

      <section className="px-6 mb-6">
        <div className="relative overflow-hidden bg-gradient-primary p-6 rounded-3xl text-white shadow-primary">
          <div className="absolute top-[-50%] right-[-20%] w-48 h-48 bg-white rounded-full blur-3xl opacity-20" />
          <div className="relative flex justify-between items-center">
            <span className="font-black text-lg">💰 الأجرة</span>
            <span className="font-black text-3xl">{formatPrice(order.total_price)}</span>
          </div>
        </div>
      </section>

      {next && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
          <button
            onClick={handleNext}
            disabled={updating}
            className={`w-full py-5 text-white rounded-3xl font-black text-lg shadow-primary transition-all duration-300 disabled:opacity-50 hover:scale-[1.02] ${next.color}`}
          >
            {updating ? '⏳ جاري التحديث...' : next.label}
          </button>
        </div>
      )}
    </main>
  )
}
