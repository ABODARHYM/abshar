'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass shadow-2xl' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-black text-base md:text-lg text-white leading-none">
                ABSHER <span className="text-amber-400">BI</span>
              </div>
              <div className="text-[10px] text-neutral-500 leading-none mt-0.5">
                أبشر بي
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: '/stores', label: 'المتاجر' },
              { href: '/orders', label: 'طلباتي' },
              { href: '/loyalty', label: 'نقاطي' },
              { href: '/referral', label: 'الإحالات' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-neutral-400 hover:text-amber-400 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-amber-400 transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex px-5 py-2.5 text-sm font-bold text-neutral-300 hover:text-amber-400 transition-colors"
            >
              دخول
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-black rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:-translate-y-0.5 transition-all"
            >
              ابدأ الآن
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-neutral-300 hover:text-amber-400"
              aria-label="القائمة"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 animate-slide-down border-t border-neutral-800/50 mt-2 pt-2">
            {[
              { href: '/stores', label: 'المتاجر', icon: '🏪' },
              { href: '/orders', label: 'طلباتي', icon: '📦' },
              { href: '/loyalty', label: 'نقاطي', icon: '⭐' },
              { href: '/referral', label: 'الإحالات', icon: '💌' },
              { href: '/login', label: 'تسجيل الدخول', icon: '🔑' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-900 hover:text-amber-400 rounded-lg transition-colors font-semibold"
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
