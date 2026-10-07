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
    alert('تم الحفظ')
  }
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-8"><h1 className="text-3xl font-bold text-gray-900">الإعدادات</h1><p className="text-gray-500 mt-1">ضبط أسعار التوصيل</p></header>
        <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm max-w-2xl">
          <h2 className="font-bold text-gray-900 mb-6">أسعار التوصيل</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">السعر الأساسي (ر.ي)</label><input type="number" value={pricing.baseFare} onChange={(e) => setPricing({ ...pricing, baseFare: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">سعر الكيلومتر (ر.ي)</label><input type="number" value={pricing.pricePerKm} onChange={(e) => setPricing({ ...pricing, pricePerKm: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">أقل سعر (ر.ي)</label><input type="number" value={pricing.minFare} onChange={(e) => setPricing({ ...pricing, minFare: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" /></div>
          </div>
          <button type="submit" className="mt-6 px-8 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition">حفظ الإعدادات</button>
        </form>
      </main>
    </div>
  )
}
