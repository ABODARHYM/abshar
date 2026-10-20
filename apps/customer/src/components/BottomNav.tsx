'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'الرئيسية', icon: 'home' },
  { href: '/stores', label: 'المتاجر', icon: 'store' },
  { href: '/orders', label: 'طلباتي', icon: 'bag' },
  { href: '/profile', label: 'حسابي', icon: 'user' },
];

function Icon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 'currentColor' : 'currentColor';
  const sw = active ? 2.2 : 1.8;

  if (name === 'home') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
  if (name === 'store') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <path d="M3 9l2-6h14l2 6" />
      <path d="M9 13h6" />
    </svg>
  );
  if (name === 'bag') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`bottom-nav-item ${active ? 'active' : ''}`}>
              <Icon name={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
