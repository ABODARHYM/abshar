'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStats } from '@/lib/hooks/useAdminData'
import { formatPrice } from '@/lib/utils/format'
import Sidebar from '@/components/Sidebar'
export default function DashboardPage() {
  const router = useRouter()
  const { stats, loading } = useStats()
  useEffect(() => { if (typeof window === 'undefined') return; if (!localStorage.getItem('admin_logged_in')) router.push('/login') }, [router])
  const cards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: '📦', gradient: 'from-blue-500 to-cyan-500' },
    { label: 'طلبات نشطة', value: stats.activeOrders, icon: '⚡', gradient: 'from-amber-500 to-orange-500' },
    { label: 'طلبات مكتملة', value: stats.deliveredOrders, icon: '✅', gradient: 'from-green-500 to-emerald-500' },
    { label: 'الإيرادات', value: formatPrice(stats.totalRevenue), icon: '💰', gradient: 'from-purple-500 to-pink-500' },
    { label: 'المندوبون', value: stats.totalDrivers, icon: '🛵', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'العملاء', value: stats.totalCustomers, icon: '👥', gradient: 'from-pink-500 to-rose-500' },
  ]
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-gray-900">📊 لوحة القيادة</h1>
          <p className="text-gray-500 mt-2 font-semibold">نظرة عامة على أداء التطبيق</p>
        </header>
        {loading ? <div className="text-center py-20"><div className="w-20 h-20 mx-auto rounded-4xl bg-gradient-primary animate-pulse-glow" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.label} className="bg-white p-6 rounded-3xl shadow-soft hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-3xl mb-5 shadow-lg`}>{card.icon}</div>
                <p className="text-sm text-gray-500 mb-2 font-bold">{card.label}</p>
                <p className="text-3xl font-black text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-soft">
            <h2 className="font-black text-gray-900 mb-5 text-xl">⚡ الإجراءات السريعة</h2>
            <div className="grid grid-cols-2 gap-4">
              <a href="/orders" className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl text-center hover:scale-105 transition-all duration-300 border-2 border-blue-100"><div className="text-4xl mb-2">📦</div><p className="font-black text-sm">إدارة الطلبات</p></a>
              <a href="/drivers" className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl text-center hover:scale-105 transition-all duration-300 border-2 border-green-100"><div className="text-4xl mb-2">🛵</div><p className="font-black text-sm">المندوبون</p></a>
              <a href="/customers" className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl text-center hover:scale-105 transition-all duration-300 border-2 border-purple-100"><div className="text-4xl mb-2">👥</div><p className="font-black text-sm">العملاء</p></a>
              <a href="/reports" className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl text-center hover:scale-105 transition-all duration-300 border-2 border-amber-100"><div className="text-4xl mb-2">📈</div><p className="font-black text-sm">التقارير</p></a>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-soft">
            <h2 className="font-black text-gray-900 mb-5 text-xl">💚 حالة النظام</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border-2 border-green-100"><span className="text-gray-700 font-bold">قاعدة البيانات</span><span className="flex items-center gap-2 text-green-600 font-black text-sm"><span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span> متصلة</span></div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border-2 border-green-100"><span className="text-gray-700 font-bold">الطلبات اللحظية</span><span className="flex items-center gap-2 text-green-600 font-black text-sm"><span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span> نشطة</span></div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border-2 border-amber-100"><span className="text-gray-700 font-bold">الإشعارات</span><span className="flex items-center gap-2 text-amber-600 font-black text-sm"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> قيد الإعداد</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
