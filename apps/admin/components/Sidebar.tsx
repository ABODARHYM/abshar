'use client'
import { usePathname, useRouter } from 'next/navigation'
const items = [
  { href: '/dashboard', icon: '📊', label: 'لوحة القيادة' },
  { href: '/orders', icon: '📦', label: 'الطلبات' },
  { href: '/drivers', icon: '🛵', label: 'المندوبون' },
  { href: '/customers', icon: '👥', label: 'العملاء' },
  { href: '/reports', icon: '📈', label: 'التقارير' },
  { href: '/settings', icon: '⚙️', label: 'الإعدادات' },
]
export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  function handleLogout() { localStorage.clear(); router.push('/login') }
  return (
    <aside className="fixed right-0 top-0 bottom-0 w-64 bg-white border-l border-gray-100 shadow-sm flex flex-col z-50">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl">أ</div>
          <div><h1 className="font-bold text-gray-900">أبشر بي</h1><p className="text-xs text-gray-500">لوحة الإدارة</p></div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <a key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="text-xl">{item.icon}</span><span>{item.label}</span>
            </a>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition">🚪 تسجيل الخروج</button>
      </div>
    </aside>
  )
}
