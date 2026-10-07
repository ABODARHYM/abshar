'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { calculatePrice, formatPrice } from '@/lib/utils/pricing'
import { createOrder } from '@/lib/hooks/useOrders'
import type { OrderType, PaymentMethod } from '@/lib/types/order'
import { ORDER_TYPE_LABELS, ORDER_TYPE_ICONS } from '@/lib/types/order'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-2xl flex items-center justify-center">
      <p className="text-gray-500">جاري تحميل الخريطة...</p>
    </div>
  ),
})

const orderTypes: OrderType[] = ['food', 'documents', 'parcels', 'custom']

export default function NewOrderPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [orderType, setOrderType] = useState<OrderType>('parcels')
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null)
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [mapMode, setMapMode] = useState<'pickup' | 'dropoff'>('pickup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const price =
    pickup && dropoff
      ? calculatePrice(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, orderType)
      : null

  async function handleSubmit() {
    if (!pickup || !dropoff || !price) return

    setLoading(true)
    setError('')

    try {
      const phone = localStorage.getItem('abshar_phone') || 'unknown'

      await createOrder(phone, {
        order_type: orderType,
        pickup_address: pickupAddress || 'موقع الاستلام',
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoffAddress || 'موقع التسليم',
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        weight_kg: weight ? parseFloat(weight) : undefined,
        notes: notes || undefined,
        distance_km: price.distanceKm,
        base_fare: price.baseFare,
        distance_fare: price.distanceFare,
        total_price: price.totalPrice,
        payment_method: paymentMethod,
      })

      router.push('/orders')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="bg-white p-6 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            →
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">طلب توصيل جديد</h1>
            <p className="text-xs text-gray-500">الخطوة {step} من 3</p>
          </div>
        </div>
      </header>

      {step === 1 && (
        <section className="p-6 space-y-4">
          <h2 className="font-bold text-gray-900 mb-4">اختر نوع الطلب</h2>
          <div className="grid grid-cols-2 gap-3">
            {orderTypes.map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`p-6 rounded-2xl text-center transition border-2 ${
                  orderType === type
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-4xl mb-2">{ORDER_TYPE_ICONS[type]}</div>
                <p className="font-semibold text-gray-900">{ORDER_TYPE_LABELS[type]}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition mt-6"
          >
            التالي ←
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="p-6 space-y-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl mb-4">
            <button
              onClick={() => setMapMode('pickup')}
              className={`flex-1 py-2 rounded-xl font-semibold transition ${
                mapMode === 'pickup'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              🟢 الاستلام
            </button>
            <button
              onClick={() => setMapMode('dropoff')}
              className={`flex-1 py-2 rounded-xl font-semibold transition ${
                mapMode === 'dropoff'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              🔴 التسليم
            </button>
          </div>

          <p className="text-sm text-gray-600 text-center bg-blue-50 py-2 rounded-xl">
            {mapMode === 'pickup'
              ? '👆 اضغط على الخريطة لاختيار موقع الاستلام'
              : '👆 اضغط على الخريطة لاختيار موقع التسليم'}
          </p>

          <Map
            pickup={pickup ? [pickup.lat, pickup.lng] : null}
            dropoff={dropoff ? [dropoff.lat, dropoff.lng] : null}
            onPickupChange={(lat, lng) => setPickup({ lat, lng })}
            onDropoffChange={(lat, lng) => setDropoff({ lat, lng })}
            mode={mapMode}
            height="400px"
          />

          <div className="space-y-3">
            {pickup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📍 عنوان الاستلام
                </label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="مثال: شارع حدة، جوار مسجد النور"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}

            {dropoff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 عنوان التسليم
                </label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="مثال: شارع تعز، بجانب الصيدلية"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!pickup || !dropoff}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition mt-6 disabled:opacity-50"
          >
            التالي ←
          </button>
        </section>
      )}

      {step === 3 && price && (
        <section className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوزن التقريبي (اختياري)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="مثال: 2.5"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              طريقة الدفع
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-2xl border-2 transition ${
                  paymentMethod === 'cash'
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-2xl mb-1">💵</div>
                <p className="font-semibold">نقدي</p>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border-2 transition ${
                  paymentMethod === 'card'
                    ? 'bg-primary-50 border-primary-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-2xl mb-1">💳</div>
                <p className="font-semibold">بطاقة</p>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">ملخص الطلب</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">المسافة</span>
                <span className="font-semibold">{price.distanceKm} كم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">السعر الأساسي</span>
                <span className="font-semibold">{formatPrice(price.baseFare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">أجرة المسافة</span>
                <span className="font-semibold">{formatPrice(price.distanceFare)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="font-bold text-gray-900">الإجمالي</span>
                <span className="font-bold text-primary-600 text-lg">
                  {formatPrice(price.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : '✓ تأكيد الطلب'}
          </button>
        </section>
      )}
    </main>
  )
}
