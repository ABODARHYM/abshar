'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { calculatePrice, formatPrice } from '@/lib/utils/pricing'
import type { OrderType, PaymentMethod } from '@/lib/types/order'
import { ORDER_TYPE_LABELS, ORDER_TYPE_ICONS } from '@/lib/types/order'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gradient-soft rounded-3xl flex items-center justify-center">
      <p className="text-primary-600 font-black">🗺️ جاري تحميل الخريطة...</p>
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

  const price = pickup && dropoff ? calculatePrice(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, orderType) : null

  async function handleSubmit() {
    if (!pickup || !dropoff || !price) return
    setLoading(true)
    setError('')

    try {
      const userId = localStorage.getItem('abshar_user_id')
      if (!userId) throw new Error('يجب تسجيل الدخول')

      const supabase = createClient()
      const orderNumber = 'ABS-' + Date.now().toString().slice(-8)

      const { data: orderData, error: insertError } = await supabase.from('orders').insert({
        order_number: orderNumber,
        customer_id: userId,
        order_type: orderType,
        pickup_address: pickupAddress || 'موقع الاستلام',
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: dropoffAddress || 'موقع التسليم',
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        weight_kg: weight ? parseFloat(weight) : null,
        notes: notes || null,
        distance_km: price.distanceKm,
        base_fare: price.baseFare,
        distance_fare: price.distanceFare,
        total_price: price.totalPrice,
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending',
      }).select().single()

      if (insertError) throw insertError

      const { data: drivers } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('is_online', true)

      if (drivers && drivers.length > 0) {
        const notifications = drivers.map((d) => ({
          user_id: d.user_id,
          title: `طلب جديد ${orderNumber}`,
          body: `طلب ${ORDER_TYPE_LABELS[orderType]} من ${pickupAddress || 'موقع'}`,
          type: 'order',
          data: { order_id: orderData.id, order_number: orderNumber },
          is_read: false,
        }))
        await supabase.from('notifications').insert(notifications)
      }

      await supabase.from('notifications').insert({
        user_id: userId,
        title: `تم استلام طلبك ${orderNumber}`,
        body: 'جاري البحث عن مندوب...',
        type: 'order',
        data: { order_id: orderData.id },
        is_read: false,
      })

      router.push('/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="bg-white/80 backdrop-blur-xl p-6 shadow-soft sticky top-0 z-40 rounded-b-4xl border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => (step > 1 ? setStep(step - 1) : router.back())} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition text-xl font-black">
            →
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900">📦 طلب توصيل جديد</h1>
            <p className="text-xs text-gray-500 font-bold">الخطوة {step} من 3</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-gradient-primary' : 'bg-gray-200'}`} />
          ))}
        </div>
      </header>

      {step === 1 && (
        <section className="p-6 space-y-4 animate-slide-up">
          <h2 className="font-black text-gray-900 text-2xl mb-6">اختر نوع الطلب</h2>
          <div className="grid grid-cols-2 gap-4">
            {orderTypes.map((type) => (
              <button key={type} onClick={() => setOrderType(type)} className={`group p-6 rounded-3xl text-center transition-all duration-300 border-2 ${orderType === type ? 'bg-gradient-primary text-white border-transparent shadow-primary scale-105' : 'bg-white border-gray-100 hover:border-primary-300'}`}>
                <div className={`text-5xl mb-3 transition-transform duration-300 ${orderType === type ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {ORDER_TYPE_ICONS[type]}
                </div>
                <p className={`font-black text-lg ${orderType === type ? 'text-white' : 'text-gray-900'}`}>
                  {ORDER_TYPE_LABELS[type]}
                </p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 mt-6">
            التالي →
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="p-6 space-y-4 animate-slide-up">
          <div className="flex gap-2 p-1.5 bg-gray-100 rounded-3xl">
            <button onClick={() => setMapMode('pickup')} className={`flex-1 py-3 rounded-2xl font-black transition-all duration-300 ${mapMode === 'pickup' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-500'}`}>
              🟢 الاستلام
            </button>
            <button onClick={() => setMapMode('dropoff')} className={`flex-1 py-3 rounded-2xl font-black transition-all duration-300 ${mapMode === 'dropoff' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500'}`}>
              🔴 التسليم
            </button>
          </div>
          <div className="bg-gradient-soft border-2 border-primary-100 py-4 px-5 rounded-3xl">
            <p className="text-sm text-primary-700 text-center font-black">
              👆 اضغط على الخريطة لاختيار موقع {mapMode === 'pickup' ? 'الاستلام' : 'التسليم'}
            </p>
          </div>
          <Map pickup={pickup ? [pickup.lat, pickup.lng] : null} dropoff={dropoff ? [dropoff.lat, dropoff.lng] : null} onPickupChange={(lat, lng) => setPickup({ lat, lng })} onDropoffChange={(lat, lng) => setDropoff({ lat, lng })} mode={mapMode} height="400px" />
          {pickup && (
            <div className="animate-fade-in">
              <label className="block text-sm font-black text-gray-700 mb-3">📍 عنوان الاستلام</label>
              <input type="text" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="شارع، حي، معلم قريب" className="w-full px-5 py-4 bg-white rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 shadow-soft font-bold border-2 border-transparent focus:border-primary-300" />
            </div>
          )}
          {dropoff && (
            <div className="animate-fade-in">
              <label className="block text-sm font-black text-gray-700 mb-3">🎯 عنوان التسليم</label>
              <input type="text" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="شارع، حي، معلم قريب" className="w-full px-5 py-4 bg-white rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 shadow-soft font-bold border-2 border-transparent focus:border-primary-300" />
            </div>
          )}
          <button onClick={() => setStep(3)} disabled={!pickup || !dropoff} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 mt-6 disabled:opacity-40 disabled:scale-100">
            التالي →
          </button>
        </section>
      )}

      {step === 3 && price && (
        <section className="p-6 space-y-4 animate-slide-up">
          <div>
            <label className="block text-sm font-black text-gray-700 mb-3">⚖️ الوزن (اختياري)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="مثال: 2.5" className="w-full px-5 py-4 bg-white rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 shadow-soft font-bold border-2 border-transparent focus:border-primary-300" />
          </div>
          <div>
            <label className="block text-sm font-black text-gray-700 mb-3">📝 ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية..." rows={3} className="w-full px-5 py-4 bg-white rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 shadow-soft font-bold resize-none border-2 border-transparent focus:border-primary-300" />
          </div>
          <div>
            <label className="block text-sm font-black text-gray-700 mb-3">💳 طريقة الدفع</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentMethod('cash')} className={`p-5 rounded-3xl border-2 transition-all duration-300 ${paymentMethod === 'cash' ? 'bg-gradient-primary text-white border-transparent shadow-primary scale-105' : 'bg-white border-gray-100'}`}>
                <div className="text-4xl mb-2">💵</div>
                <p className="font-black">نقدي</p>
              </button>
              <button onClick={() => setPaymentMethod('card')} className={`p-5 rounded-3xl border-2 transition-all duration-300 ${paymentMethod === 'card' ? 'bg-gradient-primary text-white border-transparent shadow-primary scale-105' : 'bg-white border-gray-100'}`}>
                <div className="text-4xl mb-2">💳</div>
                <p className="font-black">بطاقة</p>
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-primary p-6 rounded-3xl text-white shadow-primary">
            <div className="absolute top-[-50%] right-[-20%] w-48 h-48 bg-white rounded-full blur-3xl opacity-20" />
            <div className="relative">
              <h3 className="font-black text-xl mb-5">📋 ملخص الطلب</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between opacity-90"><span className="font-semibold">المسافة</span><span className="font-black">{price.distanceKm} كم</span></div>
                <div className="flex justify-between opacity-90"><span className="font-semibold">السعر الأساسي</span><span className="font-black">{formatPrice(price.baseFare)}</span></div>
                <div className="flex justify-between opacity-90"><span className="font-semibold">أجرة المسافة</span><span className="font-black">{formatPrice(price.distanceFare)}</span></div>
                <div className="flex justify-between pt-4 border-t border-white/20">
                  <span className="font-black text-lg">الإجمالي</span>
                  <span className="font-black text-2xl">{formatPrice(price.totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
          {error && <p className="text-center text-sm text-red-600 bg-red-50 py-3 rounded-2xl font-bold">{error}</p>}
          <button onClick={handleSubmit} disabled={loading} className="w-full py-5 bg-gradient-primary text-white rounded-3xl font-black text-lg shadow-primary hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:scale-100">
            {loading ? '⏳ جاري الإرسال...' : '✓ تأكيد الطلب'}
          </button>
        </section>
      )}
    </main>
  )
}
