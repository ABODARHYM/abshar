'use client'
import { usePathname } from 'next/navigation'
const items = [
  { href: '/dashboard', icon: '🏠', label: 'الرئيسية' },
  { href: '/orders', icon: '📋', label: 'طلباتي' },
  { href: '/orders/new', icon: '+', label: 'طلب', primary: true },
  { href: '/profile', icon: '👤', label: 'حسابي' },
  { href: '/support', icon: '💬', label: 'الدعم' },
]
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-md mx-auto glass rounded-4xl shadow-2xl border border-white/60 p-2">
        <div className="flex justify-around items-center">
          {items.map((item) => {
            const isActive = pathname === item.href
            if (item.primary) {
              return (
                <a key={item.href} href={item.href} className="-mt-8 w-16 h-16 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-primary hover:scale-110 transition-all duration-300 border-4 border-white">
                  <span className="text-white text-3xl font-black leading-none">{item.icon}</span>
                </a>
              )
            }
            return (
              <a key={item.href} href={item.href} className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 min-w-[56px] ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-125' : ''}`}>{item.icon}</span>
                <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-primary-600 mt-1" />}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
