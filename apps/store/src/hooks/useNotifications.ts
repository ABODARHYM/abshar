import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export type NotifType =
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_READY'
  | 'DRIVER_ASSIGNED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'EARNINGS_ADDED'
  | 'LOYALTY_EARNED';

type Handler = (payload: any) => void;

type Handlers = {
  onAny?: (n: { type: NotifType; payload: any; title: string; body: string }) => void;
} & Partial<Record<NotifType, Handler>>;

const SOUND: Partial<Record<NotifType, string>> = {
  ORDER_CREATED: '/sounds/new-order.mp3',
  ORDER_ACCEPTED: '/sounds/accepted.mp3',
  ORDER_READY: '/sounds/ready.mp3',
  DRIVER_ASSIGNED: '/sounds/driver-assigned.mp3',
  ORDER_DELIVERED: '/sounds/delivered.mp3',
  EARNINGS_ADDED: '/sounds/cash.mp3',
  LOYALTY_EARNED: '/sounds/reward.mp3',
};

export function useNotifications(opts: {
  userId: string;
  role: 'customer' | 'store' | 'driver' | 'admin';
  token: string;
  handlers?: Handlers;
  soundEnabled?: boolean;
}) {
  const { userId, role, token, handlers = {}, soundEnabled = true } = opts;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId || !token) return;
    const base = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    const s = io(`${base}/notifications`, {
      auth: { token, userId, role },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = s;

    s.on('connect', () => console.log('🔔 Notifications WS connected', s.id));
    s.on('connect_error', (e) => console.error('❌ WS connect_error:', e.message));
    s.on('disconnect', (r) => console.log('🔌 WS disconnect:', r));

    s.on('notification', (n: any) => {
      const type = n.type as NotifType;
      if (soundEnabled && SOUND[type]) {
        try { new Audio(SOUND[type]!).play().catch(() => {}); } catch {}
      }
      handlers.onAny?.({ type, payload: n, title: n.title, body: n.body });
      handlers[type]?.(n);
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(n.title ?? 'إشعار', { body: n.body, icon: '/icon-192.png' });
        } catch {}
      }
    });

    return () => { s.disconnect(); socketRef.current = null; };
  }, [userId, role, token, soundEnabled]);

  return { socket: socketRef.current };
}
