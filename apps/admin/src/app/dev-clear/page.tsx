'use client';

import { useEffect, useState } from 'react';

export default function DevClearPage() {
  const [status, setStatus] = useState('جاري المسح...');

  useEffect(() => {
    (async () => {
      const log: string[] = [];
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          log.push(`✅ ${regs.length} Service Workers unregistered`);
        }

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          log.push(`✅ ${keys.length} caches deleted`);
        }

        localStorage.clear();
        log.push('✅ localStorage cleared');

        setStatus(log.join('\n') + '\n\n✅ جاهز — جاري إعادة التحميل...');

        setTimeout(() => {
          window.location.href = '/login?fresh=' + Date.now();
        }, 2000);
      } catch (e) {
        setStatus('❌ ' + (e as Error).message);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fafafa', padding: 24 }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🧹</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>مسح الكاش</h1>
        <pre style={{ fontSize: 11, textAlign: 'left', background: '#1a1a1a', padding: 16, borderRadius: 12, whiteSpace: 'pre-wrap', direction: 'ltr' }}>
          {status}
        </pre>
      </div>
    </div>
  );
}
