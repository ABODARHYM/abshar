'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAllOrders } from '@/lib/hooks/useAdminData'
import { formatPrice, formatDate } from '@/lib/utils/format'
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, type OrderStatus } from '@/lib/types/order'
import Sidebar from '@/components/Sidebar'
const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700', accepted: 'bg-blue-100 text-blue-700',
  heading_to_pickup: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-cyan-100 text-cyan-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
export default function OrdersPage() {
  const router = useRouter()
  const { orders, loading } = useAllOrders()
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  useEffect(() => { if (typeof window === 'undefined') return; if (!localStorage.getItem('admin_logged_in')) router.push('/login') }, [router])
  const filtered = orders.filter((o) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search || o.order_number.includes(search) || o.pickup_address.includes(search)
    return matchStatus && matchSearch
  })
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6"><h1 className="text-4xl font-black text-gray-900">📦 الطلبات</h1><p className="text-gray-500 mt-2 font-semibold">{orders.length} طلب إجمالي</p></header>
        <div className="bg-white p-5 rounded-3xl shadow-soft mb-6 space-y-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث برقم الطلب أو العنوان..." className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setFilter('all')} className={`px-5 py-3 rounded-2xl whitespace-nowrap font-black transition-all duration-300 ${filter === 'all' ? 'bg-gradient-primary text-white shadow-primary' : 'bg-gray-100 text-gray-600'}`}>الكل ({orders.length})</button>
            {(['pending', 'accepted', 'on_the_way', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-5 py-3 rounded-2xl whitespace-nowrap font-black transition-all duration-300 ${filter === s ? 'bg-gradient-primary text-white shadow-primary' : 'bg-gray-100 text-gray-600'}`}>{ORDER_STATUS_LABELS[s]} ({orders.filter((o) => o.status === s).length})</button>
            ))}
          </div>
        </div>
        {loading ? <div className="text-center py-20"><div className="w-20 h-20 mx-auto rounded-4xl bg-gradient-primary animate-pulse-glow" /></div>
        : filtered.length === 0 ? <div className="bg-white p-12 rounded-3xl text-center shadow-soft"><div className="text-7xl mb-4">📭</div><h3 className="font-black text-gray-900 text-xl">لا توجد طلبات مطابقة</h3></div>
        : (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-soft border-b border-gray-100">
                <tr>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">رقم الطلب</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">النوع</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">المسار</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">الحالة</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">المبلغ</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="p-5 text-sm font-mono font-bold" dir="ltr">{order.order_number}</td>
                    <td className="p-5 text-sm font-bold">{ORDER_TYPE_LABELS[order.order_type]}</td>
                    <td className="p-5 text-sm text-gray-600 max-w-xs"><p className="line-clamp-1 font-semibold">📍 {order.pickup_address}</p><p className="line-clamp-1 font-semibold">🎯 {order.dropoff_address}</p></td>
                    <td className="p-5"><span className={`px-3 py-1.5 rounded-2xl text-xs font-black ${statusColors[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                    <td className="p-5 text-sm font-black text-primary-600">{formatPrice(order.total_price)}</td>
                    <td className="p-5 text-xs text-gray-500 font-semibold">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
