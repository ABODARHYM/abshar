'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/format'
import Sidebar from '@/components/Sidebar'
interface Profile {
  id: string; full_name: string; phone: string; email: string | null
  role: string; is_active: boolean; created_at: string
}
export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('admin_logged_in')) router.push('/login')
    const supabase = createClient()
    supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }).then(({ data }) => { setCustomers((data || []) as Profile[]); setLoading(false) })
  }, [router])
  const filtered = customers.filter((c) => !search || c.full_name?.includes(search) || c.phone?.includes(search))
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-8">
        <header className="mb-6"><h1 className="text-3xl font-bold text-gray-900">العملاء</h1><p className="text-gray-500 mt-1">{customers.length} عميل مسجل</p></header>
        <div className="bg-white p-4 rounded-2xl shadow-sm mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث بالاسم أو الجوال..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:outline-none" />
        </div>
        {loading ? <div className="text-center py-12"><p className="text-gray-500">جاري التحميل...</p></div> : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl text-center"><div className="text-6xl mb-4">👥</div><h3 className="font-bold text-gray-900">لا يوجد عملاء</h3></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">الاسم</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">الجوال</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">البريد</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">الحالة</th>
                  <th className="text-right p-4 font-semibold text-gray-700 text-sm">التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-semibold text-gray-900">{c.full_name || '—'}</td>
                    <td className="p-4 text-sm font-mono" dir="ltr">{c.phone}</td>
                    <td className="p-4 text-sm text-gray-500">{c.email || '—'}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'نشط' : 'محظور'}</span></td>
                    <td className="p-4 text-xs text-gray-500">{formatDate(c.created_at)}</td>
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
