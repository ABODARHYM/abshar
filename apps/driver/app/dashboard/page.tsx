'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/pricing'
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS, type Order } from '@/lib/types/order'
import BottomNav from '@/components/BottomNav'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [wallet, setWallet] = useState(0)
  const [driverId, setDriverId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', authUser.id)
        .single()

      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      setUser({
        name: profile?.full_name || 'مندوب',
        phone: profile?.phone || '',
      })
      setIsOnline(driver?.is_online || false)
      setWallet(Number(driver?.wallet_balance || 0))
      setDriverId(driver?.id || null)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!isOnline) return

    const supabase = createClient()
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
      setOrders((data || []) as Order[])
    }
    load()

    const channel = supabase
      .channel('driver-available-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isOnline])

  async function toggleOnline() {
    const next = !isOnline
    setIsOnline(next)

    if (driverId) {
      const supabase = createClient()
      await supabase.from('drivers').update({ is_online: next }).eq('id', driverId)
    }
  }

  async function handleAccept(orderId: string) {
    if (!driverId) { alert('خطأ في المندوب'); return }
    setAccepting(orderId)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: driverId, status: 'accepted' })
        .eq('id', orderId)

      if (error) throw error
      router.push(`/orders/${orderId}`)
    } catch (err) {
      alert('حدث خطأ')
    } finally {
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft" dir="rtl">
        <div className="w-20 h-20 rounded-4xl bg-gradient-primary animate-pulse-glow" />
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white rounded-b-4xl p-8 pb-20 shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm opacity-90 mb-1 font-semibold">مرحباً 👋</p>
              <h1 className="text-2xl font-black">{user.name}</h1>
            </div>
            <button
              onClick={toggleOnline}
              className={`px-5 py-3 rounded-2xl font-bold text-sm transition backdrop-blur border border-white/20 ${isOnline ? 'bg-green-500 shadow-lg' : 'bg-white/20'}`}
            >
              {isOnline ? '🟢 متصل' : '⚪ غير متصل'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-3xl p-4 border border-white/30">
              <p className="text-3xl font-black mb-1">{orders.length}</p>
              <p className="text-xs opacity-90 font-semibold">طلبات متاحة</p>
            </div>
            <div className="glass rounded-3xl p-4 border border-white/30">
              <p className="text-xl font-black mb-1">{formatPrice(wallet)}</p>
              <p className="text-xs opacity-90 font-semibold">الرصيد</p>
            </div>
          </div>
        </div>
      </header>

      <section className="p-6 -mt-12 relative z-10">
        {!isOnline ? (
          <div className="bg-white p-10 rounded-3xl shadow-soft text-center animate-fade-in">
            <div className="text-7xl mb-5">😴</div>
            <h3 className="font-black text-gray-900 mb-2 text-xl">أنت غير متصل</h3>
            <p className="text-sm text-gray-500 mb-6 font-semibold">فعّل الاتصال لاستقبال الطلبات</p>
            <button onClick={toggleOnline} className="px-8 py-4 bg-gradient-primary text-white rounded-3xl font-black shadow-primary hover:scale-105 transition-all duration-300">
              🟢 تفعيل الاتصال
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-soft">
            <div className="text-7xl mb-5">🔍</div>
            <h3 className="font-black text-gray-900 mb-2 text-xl">لا توجد طلبات حالياً</h3>
            <p className="text-sm text-gray-500 font-semibold">سيتم إشعارك عند وصول طلبات جديدة</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-black text-gray-900 mb-3 text-xl">📦 طلبات متاحة ({orders.length})</h2>
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-3xl shadow-soft hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-3xl bg-gradient-soft flex items-center justify-center text-3xl border border-primary-100">
                    {ORDER_TYPE_ICONS[order.order_type]}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-lg">{ORDER_TYPE_LABELS[order.order_type]}</p>
                    <p className="text-sm text-gray-500 font-semibold">{order.distance_km} كم · {formatPrice(order.total_price)}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  <div className="flex items-start gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700 line-clamp-1 font-semibold">{order.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700 line-clamp-1 font-semibold">{order.dropoff_address}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => router.push(`/orders/${order.id}`)} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 transition">
                    تفاصيل
                  </button>
                  <button onClick={() => handleAccept(order.id)} disabled={accepting === order.id} className="flex-1 py-4 bg-gradient-primary text-white rounded-2xl font-black shadow-primary hover:scale-[1.02] transition-all duration-300 disabled:opacity-50">
                    {accepting === order.id ? '⏳' : '✓ قبول'}
                  </button>
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
