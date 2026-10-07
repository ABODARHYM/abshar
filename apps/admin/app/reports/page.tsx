'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStats, useAllOrders } from '@/lib/hooks/useAdminData'
import { formatPrice } from '@/lib/utils/format'
import { ORDER_TYPE_LABELS } from '@/lib/types/order'
import Sidebar from '@/components/Sidebar'
export default function ReportsPage() {
  const router = useRouter()
  const { stats } = useStats()
  const { orders } = useAllOrders()
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
  }, [router])
  const byType = orders.reduce((acc, o) => { acc[o.order_type] = (acc[o.order_type] || 0) + 1; return acc }, {} as Record<string, number>)
  const byStatus = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8"><h1 className="text-3xl font-bold text-gray-900">التقارير</h1><p className="text-gray-500 mt-1">إحصائيات تفصيلية</p></header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl"><p className="text-sm opacity-80 mb-1">إجمالي الطلبات</p><p className="text-4xl font-bold">{stats.totalOrders}</p></div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl"><p className="text-sm opacity-80 mb-1">مكتملة</p><p className="text-4xl font-bold">{stats.deliveredOrders}</p></div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl"><p className="text-sm opacity-80 mb-1">الإيرادات</p><p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">توزيع الطلبات حسب النوع</h2>
            <div className="space-y-3">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1"><span>{ORDER_TYPE_LABELS[type as keyof typeof ORDER_TYPE_LABELS] || type}</span><span className="font-semibold">{count}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-primary-600 h-2 rounded-full" style={{ width: `${(count / orders.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">توزيع الطلبات حسب الحالة</h2>
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1"><span>{status}</span><span className="font-semibold">{count}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-primary-600 h-2 rounded-full" style={{ width: `${(count / orders.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
