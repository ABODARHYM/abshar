'use client';

import Link from 'next/link';
import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

interface Props {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showCart?: boolean;
  cartCount?: number;
}

export default function TopBar({ title, showBack, showSearch, showCart, cartCount = 0 }: Props) {
  const [location] = useState('مأرب');

  return (
    <header className="sticky top-0 z-30 glass border-b border-[var(--bg-border)] safe-top">
      <div className="container-app">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Right side (RTL) */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {showBack && (
              <Link
                href="/"
                className="p-2 -mr-2 text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-full transition"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            )}

            {title ? (
              <h1 className="font-black text-lg truncate">{title}</h1>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/branding/logo.svg"
                  alt="ABSHER BI"
                  className="w-9 h-9 rounded-xl shadow-lg shadow-red-500/20"
                />
                <div className="flex flex-col leading-none min-w-0">
                  <span className="font-black text-sm tracking-tight">
                    ABSHER <span className="text-[var(--brand-red)]">BI</span>
                  </span>
                  <button className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] truncate">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--brand-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{location}</span>
                  </button>
                </div>
              </Link>
            )}
          </div>

          {/* Left side (RTL) — actions */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <Link href="/stores" className="p-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-full transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </Link>
            )}

            {showCart && (
              <Link href="/cart" className="relative p-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-full transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
