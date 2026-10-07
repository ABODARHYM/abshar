'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
export default function SettingsPage() {
  const router = useRouter()
  const [pricing, setPricing] = useState({ baseFare: '500', pricePerKm: '200', minFare: '500' })
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
    const saved = localStorage.getItem('admin_pricing')
    if (saved) setPricing(JSON.parse(saved))
  }, [router])
  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('admin_pricing', JSON.stringify(pricing))
    alert('✅ تم الحفظ')
  }
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8"><h1 className="text-4xl font-black text-gray-900">⚙️ الإعدادات</h1><p className="text-gray-500 mt-2 font-semibold">ضبط أسعار التوصيل</p></header>
        <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-soft max-w-2xl">
          <h2 className="font-black text-gray-900 mb-6 text-xl">💰 أسعار التوصيل</h2>
          <div className="space-y-5">
            <div><label className="block text-sm font-black text-gray-700 mb-3">السعر الأساسي (ر.ي)</label><input type="number" value={pricing.baseFare} onChange={(e) => setPricing({ ...pricing, baseFare: e.target.value })} className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
            <div><label className="block text-sm font-black text-gray-700 mb-3">سعر الكيلومتر (ر.ي)</label><input type="number" value={pricing.pricePerKm} onChange={(e) => setPricing({ ...pricing, pricePerKm: e.target.value })} className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
            <div><label className="block text-sm font-black text-gray-700 mb-3">أقل سعر (ر.ي)</label><input type="number" value={pricing.minFare} onChange={(e) => setPricing({ ...pricing, minFare: e.target.value })} className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300" /></div>
          </div>
          <button type="submit" className="mt-8 px-10 py-4 bg-gradient-primary text-white rounded-3xl font-black shadow-primary hover:scale-[1.02] transition-all duration-300">💾 حفظ الإعدادات</button>
        </form>
      </main>
    </div>
  )
}
