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
    <aside className="fixed right-0 top-0 bottom-0 w-64 bg-white/80 backdrop-blur-xl border-l border-gray-100 shadow-soft flex flex-col z-50">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-gradient-primary flex items-center justify-center text-white text-2xl font-black shadow-primary">أ</div>
          <div><h1 className="font-black text-gray-900">أبشر بي</h1><p className="text-xs text-primary-600 font-bold">لوحة الإدارة</p></div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <a key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gradient-primary text-white font-bold shadow-primary' : 'text-gray-600 hover:bg-primary-50 font-semibold'}`}>
              <span className="text-xl">{item.icon}</span><span>{item.label}</span>
            </a>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition border-2 border-red-100">🚪 تسجيل الخروج</button>
      </div>
    </aside>
  )
}
