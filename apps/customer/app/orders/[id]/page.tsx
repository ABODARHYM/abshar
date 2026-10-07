'use client'

import { use } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useOrder } from '@/lib/hooks/useOrders'
import { formatPrice } from '@/lib/utils/pricing'
import StatusBadge from '@/components/StatusBadge'
import {
  ORDER_TYPE_LABELS,
  ORDER_TYPE_ICONS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '@/lib/types/order'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const statusSteps: OrderStatus[] = [
  'pending',
  'accepted',
  'heading_to_pickup',
  'picked_up',
  'on_the_way',
  'delivered',
]

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { order, loading, error } = useOrder(id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="font-bold text-gray-900 mb-2">لم يتم العثور على الطلب</h2>
          <button
            onClick={() => router.push('/orders')}
            className="mt-4 px-6 py-3 bg-primary-600 text-white rounded-2xl font-semibold"
          >
            العودة للطلبات
          </button>
        </div>
      </div>
    )
  }

  const currentStepIndex = statusSteps.indexOf(order.status)

  return (
    <main className="min-h-screen bg-gray-50 pb-8 relative" dir="rtl">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            →
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">تفاصيل الطلب</h1>
            <p className="text-xs text-gray-500" dir="ltr">{order.order_number}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </header>

      <section className="p-6">
        <Map
          pickup={[order.pickup_lat, order.pickup_lng]}
          dropoff={[order.dropoff_lat, order.dropoff_lng]}
          mode="view"
          height="280px"
        />
      </section>

      {order.status !== 'cancelled' && (
        <section className="px-6 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">حالة الطلب</h3>
            <div className="space-y-3">
              {statusSteps.map((status, index) => {
                const isDone = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isDone
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                    >
                      {isDone ? '✓' : index + 1}
                    </div>
                    <p className={`text-sm ${isDone ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{ORDER_TYPE_ICONS[order.order_type]}</div>
            <div>
              <p className="text-xs text-gray-500">نوع الطلب</p>
              <p className="font-semibold">{ORDER_TYPE_LABELS[order.order_type]}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-1">📍 الاستلام</p>
            <p className="font-medium text-gray-800">{order.pickup_address}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-1">🎯 التسليم</p>
            <p className="font-medium text-gray-800">{order.dropoff_address}</p>
          </div>

          {order.notes && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-1">📝 ملاحظات</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">تفاصيل السعر</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المسافة</span>
              <span className="font-semibold">{order.distance_km} كم</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">السعر الأساسي</span>
              <span className="font-semibold">{formatPrice(order.base_fare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">أجرة المسافة</span>
              <span className="font-semibold">{formatPrice(order.distance_fare)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-900">الإجمالي</span>
              <span className="font-bold text-primary-600 text-lg">
                {formatPrice(order.total_price)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 pt-2">
              <span>طريقة الدفع</span>
              <span>{order.payment_method === 'cash' ? '💵 نقدي' : '💳 بطاقة'}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
