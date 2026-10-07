'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStats } from '@/lib/hooks/useAdminData'
import { formatPrice } from '@/lib/utils/format'
import Sidebar from '@/components/Sidebar'
export default function DashboardPage() {
  const router = useRouter()
  const { stats, loading } = useStats()
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
  }, [router])
  const cards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: '📦', color: 'bg-blue-500' },
    { label: 'طلبات نشطة', value: stats.activeOrders, icon: '⚡', color: 'bg-yellow-500' },
    { label: 'طلبات مكتملة', value: stats.deliveredOrders, icon: '✅', color: 'bg-green-500' },
    { label: 'إجمالي الإيرادات', value: formatPrice(stats.totalRevenue), icon: '💰', color: 'bg-purple-500' },
    { label: 'المندوبون', value: stats.totalDrivers, icon: '🛵', color: 'bg-indigo-500' },
    { label: 'العملاء', value: stats.totalCustomers, icon: '👥', color: 'bg-pink-500' },
  ]
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8"><h1 className="text-3xl font-bold text-gray-900">لوحة القيادة</h1><p className="text-gray-500 mt-1">نظرة عامة على أداء التطبيق</p></header>
        {loading ? <div className="text-center py-12"><p className="text-gray-500">جاري التحميل...</p></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.label} className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl ${card.color} flex items-center justify-center text-2xl`}>{card.icon}</div>
                </div>
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">الإجراءات السريعة</h2>
            <div className="grid grid-cols-2 gap-3">
              <a href="/orders" className="p-4 bg-blue-50 rounded-2xl text-center hover:bg-blue-100 transition"><div className="text-3xl mb-2">📦</div><p className="font-semibold text-sm">إدارة الطلبات</p></a>
              <a href="/drivers" className="p-4 bg-green-50 rounded-2xl text-center hover:bg-green-100 transition"><div className="text-3xl mb-2">🛵</div><p className="font-semibold text-sm">إدارة المندوبين</p></a>
              <a href="/customers" className="p-4 bg-purple-50 rounded-2xl text-center hover:bg-purple-100 transition"><div className="text-3xl mb-2">👥</div><p className="font-semibold text-sm">إدارة العملاء</p></a>
              <a href="/reports" className="p-4 bg-yellow-50 rounded-2xl text-center hover:bg-yellow-100 transition"><div className="text-3xl mb-2">📈</div><p className="font-semibold text-sm">التقارير</p></a>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">حالة النظام</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-gray-600">قاعدة البيانات</span><span className="flex items-center gap-2 text-green-600 text-sm font-semibold"><span className="w-2 h-2 bg-green-500 rounded-full"></span> متصلة</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">الطلبات اللحظية</span><span className="flex items-center gap-2 text-green-600 text-sm font-semibold"><span className="w-2 h-2 bg-green-500 rounded-full"></span> نشطة</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">الإشعارات</span><span className="flex items-center gap-2 text-yellow-600 text-sm font-semibold"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> قيد الإعداد</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
