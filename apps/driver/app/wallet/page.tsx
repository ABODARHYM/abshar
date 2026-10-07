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
  const transactions = [{ id: 1, type: 'earning', amount: 1500, description: 'طلب ABS-123456', date: '2026-10-07' }]
  return (
    <main className="min-h-screen bg-gray-50 pb-24 relative" dir="rtl">
      <header className="bg-gradient-to-br from-primary-600 to-primary-800 text-white p-8 rounded-b-3xl shadow-lg">
        <p className="text-sm opacity-80 mb-2">رصيد المحفظة</p>
        <p className="text-4xl font-bold mb-6">{formatPrice(balance)}</p>
        <div className="flex gap-2">
          <button className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-2xl font-semibold backdrop-blur">💸 سحب</button>
          <button className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-2xl font-semibold backdrop-blur">📊 التقارير</button>
        </div>
      </header>
      <section className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">سجل المعاملات</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {transactions.map((t) => (
            <div key={t.id} className="p-5 flex justify-between items-center">
              <div><p className="font-semibold text-gray-900">{t.description}</p><p className="text-xs text-gray-500">{t.date}</p></div>
              <span className="font-bold text-green-600">+{formatPrice(t.amount)}</span>
            </div>
          ))}
        </div>
      </section>
      <BottomNav />
    </main>
  )
}
