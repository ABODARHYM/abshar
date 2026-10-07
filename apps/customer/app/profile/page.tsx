'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isLoggedIn = localStorage.getItem('abshar_logged_in')
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    setUser({
      name: localStorage.getItem('abshar_name') || 'مستخدم جديد',
      phone: localStorage.getItem('abshar_phone') || '',
    })
  }, [router])

  function handleLogout() {
    if (typeof window === 'undefined') return
    localStorage.clear()
    router.push('/login')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      <header className="bg-primary-600 text-white p-8 rounded-b-3xl shadow-lg">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center text-5xl">
            👤
          </div>
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm opacity-80 mt-1" dir="ltr">{user.phone}</p>
        </div>
      </header>

      <section className="p-6 -mt-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon="📦" label="طلباتي" href="/orders" />
          <MenuItem icon="📍" label="عناويني المحفوظة" href="#" />
          <MenuItem icon="💳" label="طرق الدفع" href="#" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon="💬" label="الدعم الفني" href="/support" />
          <MenuItem icon="📄" label="الشروط والأحكام" href="#" />
          <MenuItem icon="ℹ️" label="عن التطبيق" href="#" />
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-semibold hover:bg-red-100 transition"
        >
          تسجيل الخروج
        </button>

        <p className="text-center text-xs text-gray-400 pt-4">
          أبشر بي v1.0.0 · © 2026 أسرار الرقمية
        </p>
      </section>

      <BottomNav />
    </main>
  )
}

function MenuItem({
  icon,
  label,
  href,
}: {
  icon: string
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-4 hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-medium text-gray-800">{label}</span>
      </div>
      <span className="text-gray-300">←</span>
    </a>
  )
}
