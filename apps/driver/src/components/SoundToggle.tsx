'use client';

import { useEffect, useState } from 'react';
import { sound } from '@/lib/sounds';

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => { setEnabled(sound.isEnabled()); }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    sound.setEnabled(next);
    if (next) sound.play('success');
  };

  return (
    <div className="card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{enabled ? '🔊' : '🔇'}</span>
        <div>
          <p className="font-bold text-sm">أصوات التنبيه</p>
          <p className="text-xs text-[var(--text-muted)]">{enabled ? 'مفعّلة' : 'معطّلة'}</p>
        </div>
      </div>
      <button
        onClick={toggle}
        className={`relative w-12 h-6 rounded-full transition-colors`}
        style={{ background: enabled ? '#10b981' : 'var(--bg-border)' }}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'right-0.5' : 'right-6'}`}
        />
      </button>
    </div>
  );
}
