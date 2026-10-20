/**
 * Web Push (VAPID) من جهة المتصفح.
 * التدفق: الإذن → المفتاح العام من الـ backend → pushManager.subscribe → حفظ الاشتراك في الخادم.
 * يتطلب Service Worker مسجّلًا (/sw.js) و HTTPS (أو localhost). على iOS يعمل فقط بعد تثبيت التطبيق.
 */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type PushState = 'checking' | 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on';

const BASE = '/api/v1/notifications/push';

export const plainFetch: Fetcher = (url, init = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options?.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  return a.length === key.length && a.every((v, i) => v === key[i]);
}

/** ينتظر الـ Service Worker لكن لا يعلّق للأبد إن فشل تسجيله. */
async function readyRegistration(timeoutMs = 6000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('sw-timeout')), timeoutMs)),
  ]);
}

async function fetchPublicKey(fetcher: Fetcher): Promise<string | null> {
  const res = await fetcher(`${BASE}/public-key`);
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey: string | null; enabled: boolean };
  return data.enabled && data.publicKey ? data.publicKey : null;
}

async function saveSubscription(fetcher: Fetcher, sub: PushSubscription): Promise<boolean> {
  const res = await fetcher(`${BASE}/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ ...sub.toJSON(), userAgent: navigator.userAgent.slice(0, 500) }),
  });
  return res.ok;
}

/** الحالة الحالية + مزامنة صامتة للاشتراك مع الخادم إن كان موجودًا والإذن ممنوحًا. */
export async function getPushState(fetcher: Fetcher = plainFetch): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const reg = await readyRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === 'granted') {
      // يضمن أن الاشتراك مسجّل للمستخدم الحالي (مثلًا بعد تبديل الحساب على نفس الجهاز)
      saveSubscription(fetcher, sub).catch(() => undefined);
      return 'on';
    }
    return 'off';
  } catch {
    return 'unsupported';
  }
}

export async function enablePush(fetcher: Fetcher = plainFetch): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';

  const publicKey = await fetchPublicKey(fetcher);
  if (!publicKey) return 'unavailable';

  const reg = await readyRegistration();
  const key = urlBase64ToUint8Array(publicKey);
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    // اشتراك قديم بمفتاح VAPID مختلف (بعد تدوير المفاتيح) لن يعمل: نعيد الاشتراك
    await sub.unsubscribe();
    sub = null;
  }
  sub = sub ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));

  if (!(await saveSubscription(fetcher, sub))) throw new Error('save-failed');
  return 'on';
}

export async function disablePush(fetcher: Fetcher = plainFetch): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  try {
    const reg = await readyRegistration(2500);
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await fetcher(`${BASE}/unsubscribe`, { method: 'DELETE', body: JSON.stringify({ endpoint }) }).catch(
        () => undefined,
      );
      await sub.unsubscribe();
    }
  } catch {
    /* لا نعطّل تسجيل الخروج بسبب فشل إلغاء الاشتراك */
  }
  return 'off';
}
