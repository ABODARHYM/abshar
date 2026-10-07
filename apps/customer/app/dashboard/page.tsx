'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isLoggedIn = localStorage.getItem('abshar_logged_in')
    const phone = localStorage.getItem('abshar_phone')
    const name = localStorage.getItem('abshar_name') || 'مستخدم جديد'

    if (!isLoggedIn || !phone) {
      router.push('/login')
      return
    }

    setUser({ name, phone })
    setLoading(false)
  }, [router])

  function handleLogout() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('abshar_logged_in')
    localStorage.removeItem('abshar_phone')
    localStorage.removeItem('abshar_name')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-primary-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm opacity-80">مرحباً بك</p>
            <h1 className="text-xl font-bold">{user.name}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition backdrop-blur"
          >
            خروج
          </button>
        </div>

        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur">
          <p className="text-sm opacity-80 mb-1">رقم الجوال</p>
          <p className="font-semibold" dir="ltr">{user.phone}</p>
        </div>
      </header>

      <section className="p-6 -mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <p className="font-semibold text-gray-900">طلب جديد</p>
            <p className="text-xs text-gray-500 mt-1">قريباً</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p className="font-semibold text-gray-900">طلباتي</p>
            <p className="text-xs text-gray-500 mt-1">قريباً</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <p className="font-semibold text-gray-900">حسابي</p>
            <p className="text-xs text-gray-500 mt-1">قريباً</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <p className="font-semibold text-gray-900">الدعم</p>
            <p className="text-xs text-gray-500 mt-1">قريباً</p>
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="font-bold text-gray-900 mb-2">التطبيق قيد البناء</h3>
          <p className="text-sm text-gray-500 mb-4">
            سنضيف الخريطة والطلبات قريباً
          </p>
        </div>
      </section>
    </main>
  )
}
