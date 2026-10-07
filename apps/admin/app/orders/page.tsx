'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAllOrders } from '@/lib/hooks/useAdminData'
import { formatPrice, formatDate } from '@/lib/utils/format'
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, type OrderStatus } from '@/lib/types/order'
import Sidebar from '@/components/Sidebar'
const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700', accepted: 'bg-blue-100 text-blue-700',
  heading_to_pickup: 'bg-indigo-100 text-indigo-700', picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-cyan-100 text-cyan-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
export default function OrdersPage() {
  const router = useRouter()
  const { orders, loading } = useAllOrders()
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
  }, [router])
  const filtered = orders.filter((o) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search || o.order_number.includes(search) || o.pickup_address.includes(search)
    return matchStatus && matchSearch
  })
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6"><h1 className="text-3xl font-bold text-gray-900">الطلبات</h1><p className="text-gray-500 mt-1">{orders.length} طلب إجمالي</p></header>
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 space-y-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث برقم الطلب أو العنوان..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>الكل ({orders.length})</button>
            {(['pending', 'accepted', 'on_the_way', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-xl whitespace-nowrap font-semibold transition ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{ORDER_STATUS_LABELS[s]} ({orders.filter((o) => o.status === s).length})</button>
            ))}
          </div>
        </div>
        {loading ? <div className="text-center py-12"><p className="text-gray-500">جاري التحميل...</p></div> : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center"><div className="text-6xl mb-4">📭</div><h3 className="font-bold text-gray-900">لا توجد طلبات مطابقة</h3></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">رقم الطلب</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">النوع</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">من → إلى</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">الحالة</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">المبلغ</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-sm font-mono" dir="ltr">{order.order_number}</td>
                    <td className="p-4 text-sm">{ORDER_TYPE_LABELS[order.order_type]}</td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs"><p className="line-clamp-1">📍 {order.pickup_address}</p><p className="line-clamp-1">🎯 {order.dropoff_address}</p></td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                    <td className="p-4 text-sm font-semibold text-primary-600">{formatPrice(order.total_price)}</td>
                    <td className="p-4 text-xs text-gray-500">{formatDate(order.created_at)}</td>
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
