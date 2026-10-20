'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminSidebar from './AdminSidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // في login — لا sidebar ولا margin
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // أثناء SSR — لا نعرض شيء لتجنب flash
  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>{children}</div>
    );
  }

  return (
    <>
      <AdminSidebar />
      <main
        className="admin-main"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-base)',
        }}
      >
        {children}
      </main>
    </>
  );
}
