'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import NotificationBell from '@/components/NotificationBell'

const quickActions = [
  { href: '/orders/new', icon: '📦', label: 'طلب جديد', sub: 'اطلب توصيل الآن', gradient: 'from-purple-500 to-pink-500' },
  { href: '/orders', icon: '📋', label: 'طلباتي', sub: 'سجل الطلبات', gradient: 'from-blue-500 to-cyan-500' },
  { href: '/profile', icon: '👤', label: 'حسابي', sub: 'إعدادات شخصية', gradient: 'from-orange-500 to-red-500' },
  { href: '/support', icon: '💬', label: 'الدعم', sub: 'تواصل معنا', gradient: 'from-green-500 to-emerald-500' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string; id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isLoggedIn = localStorage.getItem('abshar_logged_in')
    const userId = localStorage.getItem('abshar_user_id')
    const phone = localStorage.getItem('abshar_phone')
    const name = localStorage.getItem('abshar_name') || 'مستخدم'

    if (!isLoggedIn || !userId) {
      router.push('/login')
      return
    }

    setUser({ name, phone: phone || '', id: userId })
    setLoading(false)
  }, [router])

  function handleLogout() {
    if (typeof window === 'undefined') return
    localStorage.clear()
    router.push('/login')
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
        <div className="absolute bottom-[-50%] left-[-20%] w-96 h-96 bg-pink-300 rounded-full blur-3xl opacity-20" />
        <div className="relative">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm opacity-90 mb-1 font-semibold">مرحباً بك 👋</p>
              <h1 className="text-3xl font-black">{user.name}</h1>
            </div>
            <div className="flex gap-2">
              <NotificationBell userId={user.id} />
              <button onClick={handleLogout} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-2xl text-sm font-bold transition backdrop-blur border border-white/20">
                خروج
              </button>
            </div>
          </div>
          <div className="glass rounded-3xl p-5 border border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-80 mb-1 font-semibold">رقم الجوال</p>
                <p className="font-black text-lg" dir="ltr">{user.phone}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl border border-white/30">
                📱
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="p-6 -mt-12 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <a key={action.href} href={action.href} className="group bg-white p-6 rounded-3xl shadow-soft hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <p className="font-black text-gray-900 mb-1">{action.label}</p>
              <p className="text-xs text-gray-500 font-semibold">{action.sub}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="px-6 mb-6">
        <div className="relative overflow-hidden bg-gradient-primary rounded-3xl p-8 text-white shadow-primary">
          <div className="absolute top-[-50%] right-[-30%] w-64 h-64 bg-white rounded-full blur-3xl opacity-20" />
          <div className="relative text-center">
            <div className="text-7xl mb-4 animate-pulse-glow inline-block rounded-full">🚀</div>
            <h3 className="text-2xl font-black mb-2">ابدأ بطلب توصيل</h3>
            <p className="text-sm opacity-90 mb-6 font-semibold">اطلب توصيل أي شيء في دقائق</p>
            <a href="/orders/new" className="inline-block px-8 py-4 bg-white text-primary-600 rounded-3xl font-black hover:scale-105 transition-all duration-300">
              طلب توصيل →
            </a>
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
