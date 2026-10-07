'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAllCustomers } from '@/lib/hooks/useAdminData'
import { formatDate } from '@/lib/utils/format'
import Sidebar from '@/components/Sidebar'

export default function CustomersPage() {
  const router = useRouter()
  const { customers, loading } = useAllCustomers()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
  }, [router])

  const filtered = customers.filter((c) =>
    !search || c.full_name?.includes(search) || c.phone?.includes(search)
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6">
          <h1 className="text-4xl font-black text-gray-900">👥 العملاء</h1>
          <p className="text-gray-500 mt-2 font-semibold">{customers.length} عميل مسجل</p>
        </header>

        <div className="bg-white p-5 rounded-3xl shadow-soft mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث بالاسم أو الجوال..."
            className="w-full px-5 py-4 bg-gray-50 rounded-3xl focus:outline-none focus:ring-4 focus:ring-primary-100 font-bold border-2 border-transparent focus:border-primary-300"
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto rounded-4xl bg-gradient-primary animate-pulse-glow" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center shadow-soft">
            <div className="text-7xl mb-4">👥</div>
            <h3 className="font-black text-gray-900 text-xl">لا يوجد عملاء</h3>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-soft border-b border-gray-100">
                <tr>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">الاسم</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">الجوال</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">البريد</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">الحالة</th>
                  <th className="text-right p-5 font-black text-gray-700 text-sm">التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="p-5 font-black text-gray-900">{c.full_name || '—'}</td>
                    <td className="p-5 text-sm font-mono font-semibold" dir="ltr">{c.phone}</td>
                    <td className="p-5 text-sm text-gray-500 font-semibold">{c.email || '—'}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-2xl text-xs font-black ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.is_active ? 'نشط' : 'محظور'}
                      </span>
                    </td>
                    <td className="p-5 text-xs text-gray-500 font-semibold">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
