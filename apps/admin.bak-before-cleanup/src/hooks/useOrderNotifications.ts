'use client';

import { useEffect, useRef } from 'react';

export function useOrderNotifications(
  token: string | null,
  onNewOrder: () => void,
) {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;

    let socket: any;
    (async () => {
      try {
        const { io } = await import('socket.io-client');

        // NEXT_PUBLIC_WS_URL = عنوان الـ backend العام (مثل https://api.example.com)
        // بدونه نفترض نفس المضيف على المنفذ 3000 (يعمل في التطوير حتى من هاتف على نفس الشبكة).
        const base =
          process.env.NEXT_PUBLIC_WS_URL?.replace(/\/+$/, '') ??
          `${window.location.protocol}//${window.location.hostname}:3000`;
        socket = io(`${base}/notifications`, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => console.log('[WS] Connected'));
        socket.on('notification', (data: any) => {
          console.log('[WS] Notification:', data);
          if (data.category === 'order' || data.category === 'delivery') {
            onNewOrder();
          }
        });
        socket.on('disconnect', () => console.log('[WS] Disconnected'));
        socket.on('connect_error', (err: any) => console.log('[WS] Error:', err.message));
      } catch (e) {
        console.log('[WS] Failed:', e);
      }
    })();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token, onNewOrder]);

  return socketRef.current;
}
