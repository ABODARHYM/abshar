'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] SW registered:', reg.scope);
          setSwReady(true);
        })
        .catch((err) => console.warn('[PWA] SW failed:', err));
    }

    // Listen for install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // اعرض الزر بعد 30 ثانية
      setTimeout(() => setShowInstall(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Track installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      setShowInstall(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('لتثبيت التطبيق:\n\nفي Chrome:\nاضغط ⋮ → إضافة إلى الشاشة الرئيسية');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const dismiss = () => setShowInstall(false);

  if (!showInstall || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 animate-slide-up">
      <div className="glass rounded-2xl p-4 shadow-2xl border border-[var(--brand-red)]/30 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-red-dark)] flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">ثبّت ABSHER BI</p>
            <p className="text-xs text-[var(--text-muted)]">تجربة أسرع بدون متجر</p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 text-[var(--text-muted)] hover:text-white transition flex-shrink-0"
            aria-label="إغلاق"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="btn btn-primary btn-sm flex-1"
          >
            📲 تثبيت
          </button>
          <button
            onClick={dismiss}
            className="btn btn-ghost btn-sm flex-1"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
