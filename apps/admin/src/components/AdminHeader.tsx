'use client';

import { useRouter } from 'next/navigation';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  action?: { label: string; onClick: () => void; icon?: string };
}

export default function AdminHeader({ title, subtitle, showBack, action }: Props) {
  const router = useRouter();

  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-2 -mr-2 text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-full transition"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black truncate">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--text-muted)] truncate">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary shrink-0">
          {action.icon && <span>{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}
