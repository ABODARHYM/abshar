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
  useEffect(() => { if (typeof window === 'undefined') return; if (!localStorage.getItem('admin_logged_in')) router.push('/login') }, [router])
  const byType = orders.reduce((acc, o) => { acc[o.order_type] = (acc[o.order_type] || 0) + 1; return acc }, {} as Record<string, number>)
  const byStatus = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8"><h1 className="text-4xl font-black text-gray-900">📈 التقارير</h1><p className="text-gray-500 mt-2 font-semibold">إحصائيات تفصيلية</p></header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-8 rounded-3xl shadow-primary"><div className="absolute top-[-50%] right-[-30%] w-64 h-64 bg-white rounded-full blur-3xl opacity-20" /><div className="relative"><p className="text-sm opacity-90 mb-2 font-bold">📦 إجمالي الطلبات</p><p className="text-5xl font-black">{stats.totalOrders}</p></div></div>
          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-500 text-white p-8 rounded-3xl shadow-primary"><div className="absolute top-[-50%] right-[-30%] w-64 h-64 bg-white rounded-full blur-3xl opacity-20" /><div className="relative"><p className="text-sm opacity-90 mb-2 font-bold">✅ مكتملة</p><p className="text-5xl font-black">{stats.deliveredOrders}</p></div></div>
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 text-white p-8 rounded-3xl shadow-primary"><div className="absolute top-[-50%] right-[-30%] w-64 h-64 bg-white rounded-full blur-3xl opacity-20" /><div className="relative"><p className="text-sm opacity-90 mb-2 font-bold">💰 الإيرادات</p><p className="text-3xl font-black">{formatPrice(stats.totalRevenue)}</p></div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-soft">
            <h2 className="font-black text-gray-900 mb-5 text-xl">📊 توزيع الطلبات حسب النوع</h2>
            <div className="space-y-4">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-2 font-bold"><span>{ORDER_TYPE_LABELS[type as keyof typeof ORDER_TYPE_LABELS] || type}</span><span>{count}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-gradient-primary h-3 rounded-full transition-all duration-500" style={{ width: `${(count / orders.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-soft">
            <h2 className="font-black text-gray-900 mb-5 text-xl">📊 توزيع الطلبات حسب الحالة</h2>
            <div className="space-y-4">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-2 font-bold"><span>{status}</span><span>{count}</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-gradient-primary h-3 rounded-full transition-all duration-500" style={{ width: `${(count / orders.length) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
