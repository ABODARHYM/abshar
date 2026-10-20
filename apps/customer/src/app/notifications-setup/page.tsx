'use client';

import Link from 'next/link';
import PushSetup from '@/components/PushSetup';
import SoundToggle from '@/components/SoundToggle';

export default function NotificationsSetupPage() {
  return (
    <div className="app-shell bg-[var(--bg-base)]" style={{ padding: '24px', minHeight: '100vh' }}>
      <div className="container-app">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/profile" className="p-2 -mr-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-black">🔔 الإشعارات</h1>
        </div>

        <div className="space-y-4">
          <PushSetup />
          <SoundToggle />

          <div className="card bg-[var(--bg-elevated)] border-[var(--bg-border)]">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">💡 نصيحة:</strong>
              {' '}بعد تفعيل الإشعارات، ستستقبل تنبيهات فورية حتى لو كان التطبيق مغلقاً.
            </p>
          </div>

          <div className="card">
            <h3 className="font-black text-sm mb-2">📱 كيف تعمل الإشعارات؟</h3>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
              <li>✅ فورية عبر WebSocket — داخل التطبيق</li>
              <li>✅ خلفية عبر Web Push — حتى مغلق</li>
              <li>✅ إشعارات النظام — Android + iOS</li>
              <li>✅ صوت تنبيه مخصص لكل نوع</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
