'use client'

import { usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard', icon: '🏠', label: 'الرئيسية' },
  { href: '/orders', icon: '📋', label: 'طلباتي' },
  { href: '/profile', icon: '👤', label: 'حسابي' },
  { href: '/support', icon: '💬', label: 'الدعم' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 shadow-lg z-50">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-4 rounded-2xl transition ${
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-primary-600'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
