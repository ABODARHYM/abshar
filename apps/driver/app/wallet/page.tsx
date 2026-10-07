'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils/pricing'
import BottomNav from '@/components/BottomNav'
export default function WalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('driver_logged_in')) { router.push('/login'); return }
    setBalance(parseFloat(localStorage.getItem('driver_wallet') || '0'))
  }, [router])
  const transactions = [{ id: 1, amount: 1500, description: 'طلب ABS-123456', date: '2026-10-07' }]
  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white p-10 rounded-b-4xl shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative">
          <p className="text-sm opacity-90 mb-2 font-bold">💰 رصيد المحفظة</p>
          <p className="text-5xl font-black mb-8">{formatPrice(balance)}</p>
          <div className="flex gap-3">
            <button className="flex-1 py-4 bg-white/20 hover:bg-white/30 rounded-3xl font-black backdrop-blur border border-white/20 transition">💸 سحب</button>
            <button className="flex-1 py-4 bg-white/20 hover:bg-white/30 rounded-3xl font-black backdrop-blur border border-white/20 transition">📊 التقارير</button>
          </div>
        </div>
      </header>
      <section className="p-6">
        <h2 className="font-black text-gray-900 mb-4 text-xl">📊 سجل المعاملات</h2>
        <div className="bg-white rounded-3xl shadow-soft divide-y divide-gray-100">
          {transactions.map((t) => (
            <div key={t.id} className="p-5 flex justify-between items-center">
              <div><p className="font-black text-gray-900">{t.description}</p><p className="text-xs text-gray-500 font-semibold">{t.date}</p></div>
              <span className="font-black text-green-600 text-lg">+{formatPrice(t.amount)}</span>
            </div>
          ))}
        </div>
      </section>
      <BottomNav />
    </main>
  )
}
