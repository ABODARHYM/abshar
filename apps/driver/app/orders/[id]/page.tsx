'use client'
import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateOrderStatus } from '@/lib/hooks/useDriverOrders'
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
    supabase.from('orders').select('*').eq('id', id).single().then(({ data }) => { setOrder(data as Order); setLoading(false) })
    const channel = supabase.channel(`d-${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => setOrder(payload.new as Order)).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])
  async function handleNext() {
    if (!order) return
    const next = nextStatus[order.status]
    if (!next) return
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, next.to)
      if (next.to === 'delivered') {
        const current = parseFloat(localStorage.getItem('driver_wallet') || '0')
        localStorage.setItem('driver_wallet', (current + order.total_price).toString())
      }
    } catch { alert('حدث خطأ') } finally { setUpdating(false) }
  }
  if (loading) return <div className="min-h-screen flex items-center justify-center" dir="rtl"><p>جاري التحميل...</p></div>
  if (!order) return <div className="min-h-screen flex items-center justify-center" dir="rtl"><p>لم يتم العثور على الطلب</p></div>
  const next = nextStatus[order.status]
  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">→</button>
          <div className="flex-1"><h1 className="font-bold text-gray-900">تفاصيل الطلب</h1><p className="text-xs text-gray-500" dir="ltr">{order.order_number}</p></div>
          <StatusBadge status={order.status} />
        </div>
      </header>
      <section className="p-6"><Map pickup={[order.pickup_lat, order.pickup_lng]} dropoff={[order.dropoff_lat, order.dropoff_lng]} height="280px" /></section>
      <section className="px-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start gap-3"><div className="text-2xl">{ORDER_TYPE_ICONS[order.order_type]}</div><div><p className="text-xs text-gray-500">نوع الطلب</p><p className="font-semibold">{ORDER_TYPE_LABELS[order.order_type]}</p></div></div>
          <div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-500 mb-1">📍 الاستلام</p><p className="font-medium text-gray-800">{order.pickup_address}</p></div>
          <div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-500 mb-1">🎯 التسليم</p><p className="font-medium text-gray-800">{order.dropoff_address}</p></div>
          {order.notes && <div className="border-t border-gray-100 pt-4"><p className="text-xs text-gray-500 mb-1">📝 ملاحظات</p><p className="text-sm text-gray-700">{order.notes}</p></div>}
        </div>
      </section>
      <section className="px-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">الأجرة</h3>
          <div className="flex justify-between items-center"><span className="text-gray-500">الإجمالي</span><span className="font-bold text-primary-600 text-2xl">{formatPrice(order.total_price)}</span></div>
        </div>
      </section>
      {next && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 z-50">
          <button onClick={handleNext} disabled={updating} className={`w-full py-4 text-white rounded-2xl font-bold text-lg transition disabled:opacity-50 ${next.color}`}>{updating ? 'جاري التحديث...' : next.label}</button>
        </div>
      )}
    </main>
  )
}
