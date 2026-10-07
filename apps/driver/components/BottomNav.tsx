'use client'
import { usePathname } from 'next/navigation'
const items = [
  { href: '/dashboard', icon: '📦', label: 'الطلبات' },
  { href: '/orders', icon: '📋', label: 'طلباتي' },
  { href: '/wallet', icon: '💰', label: 'المحفظة' },
  { href: '/profile', icon: '👤', label: 'حسابي' },
]
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 shadow-2xl z-50">
      <div className="flex justify-around items-center py-2 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <a key={item.href} href={item.href} className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition min-w-[60px] ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
