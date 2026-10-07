'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/pricing'
import BottomNav from '@/components/BottomNav'

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
  status: string
}

export default function WalletPage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const driverId = localStorage.getItem('driver_id')
    if (!driverId) { router.push('/login'); return }

    const supabase = createClient()
    const load = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('wallet_balance')
        .eq('id', driverId)
        .single()

      setBalance(Number(driver?.wallet_balance || 0))

      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(50)

      setTransactions((txs || []) as Transaction[])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft" dir="rtl">
        <div className="w-20 h-20 rounded-4xl bg-gradient-primary animate-pulse-glow" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-32 relative" dir="rtl">
      <header className="relative overflow-hidden bg-gradient-primary text-white p-10 rounded-b-4xl shadow-primary">
        <div className="absolute top-[-50%] right-[-20%] w-96 h-96 bg-white rounded-full blur-3xl opacity-10" />
        <div className="relative">
          <p className="text-sm opacity-90 mb-2 font-bold">💰 رصيد المحفظة</p>
          <p className="text-5xl font-black mb-8">{formatPrice(balance)}</p>
          <div className="flex gap-3">
            <button className="flex-1 py-4 bg-white/20 hover:bg-white/30 rounded-3xl font-black backdrop-blur border border-white/20 transition">
              💸 سحب
            </button>
            <button className="flex-1 py-4 bg-white/20 hover:bg-white/30 rounded-3xl font-black backdrop-blur border border-white/20 transition">
              📊 التقارير
            </button>
          </div>
        </div>
      </header>

      <section className="p-6">
        <h2 className="font-black text-gray-900 mb-4 text-xl">📊 سجل المعاملات</h2>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-500 font-semibold">لا توجد معاملات بعد</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-soft divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-5 flex justify-between items-center">
                <div>
                  <p className="font-black text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-500 font-semibold">
                    {new Date(tx.created_at).toLocaleString('ar-YE')}
                  </p>
                </div>
                <span className={`font-black text-lg ${tx.type === 'earning' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-600' : 'text-primary-600'}`}>
                  {tx.type === 'earning' ? '+' : tx.type === 'withdrawal' ? '-' : ''}{formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  )
}
