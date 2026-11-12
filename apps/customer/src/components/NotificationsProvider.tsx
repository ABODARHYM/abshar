'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

interface Props {
  children: React.ReactNode;
}

export default function NotificationsProvider({ children }: Props) {
  const [userId, setUserId] = useState<string>('');
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    const rawUser = localStorage.getItem('user');

    if (!t) return;
    setToken(t);

    // استخراج userId من localStorage.user أو من JWT
    let uid = '';
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        uid = u.id || u.userId || u.user_id || '';
      } catch {}
    }

    if (!uid) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        uid = payload.sub || payload.userId || payload.id || '';
      } catch {}
    }

    if (uid) {
      setUserId(uid);
    } else {
      console.warn('[Notifications] userId غير موجود — WS لن يتصل');
    }
  }, []);

  useNotifications({
    userId,
    role: 'customer',
    token,
    handlers: {
      ORDER_ACCEPTED: (d) => {
        console.log('✅ تم قبول طلبك:', d?.orderNumber);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notification:refresh'));
        }
      },
      DRIVER_ASSIGNED: (d) => {
        console.log('🛵 مندوبك في الطريق:', d?.orderNumber);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notification:refresh'));
        }
      },
      ORDER_DELIVERED: (d) => {
        console.log('🎉 تم التسليم:', d?.orderNumber);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notification:refresh'));
        }
      },
      LOYALTY_EARNED: (d) => {
        console.log('🎁 نقاط ولاء:', d?.points);
      },
      onAny: (n) => {
        console.log('🔔 إشعار:', n.type, n.body);
      },
    },
  });

  return <>{children}</>;
}
