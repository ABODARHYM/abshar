'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function subscriptionUsesKey(sub: PushSubscription, publicKey: string): boolean {
  const currentKey = sub.options?.applicationServerKey;
  if (!currentKey) return false;
  const expected = urlBase64ToUint8Array(publicKey);
  const actual = new Uint8Array(currentKey);
  if (actual.length !== expected.length) return false;
  return actual.every((byte, index) => byte === expected[index]);
}

export default function PushSetup() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (!ok) return;

    let disposed = false;
    const syncSubscription = async () => {
      try {
        setPermission(Notification.permission);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub || Notification.permission !== 'granted') {
          if (!disposed) setSubscribed(false);
          return;
        }
        const keyResponse = await authFetch('/api/v1/notifications/push/public-key');
        if (!keyResponse.ok) {
          if (!disposed) setError('تعذر التحقق من مفتاح الإشعارات الحالي. أعد المحاولة.');
          return;
        }
        const { publicKey, enabled } = await keyResponse.json();
        if (!enabled || !publicKey) {
          if (!disposed) setError('الإشعارات غير مفعلة على الخادم');
          return;
        }
        if (!subscriptionUsesKey(sub, publicKey)) {
          if (!disposed) {
            setSubscribed(false);
            setError('تم تحديث مفتاح الإشعارات. اضغط «تفعيل» لإعادة ربط هذا الجهاز.');
          }
          return;
        }
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          if (!disposed) setError('اشتراك الإشعارات على هذا الجهاز غير مكتمل. أعد تفعيله.');
          return;
        }
        // Re-sync on app start, login return, and tab resume. This repairs
        // subscriptions that exist in the browser but were lost on the API.
        const response = await authFetch('/api/v1/notifications/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent,
          }),
        });
        if (!disposed) {
          setSubscribed(response.ok);
          if (!response.ok && response.status !== 401) {
            setError('تعذر مزامنة اشتراك الإشعارات مع الخادم. أعد المحاولة من إعدادات الإشعارات.');
          } else if (response.ok) {
            setError('');
          }
        }
      } catch (e) {
        if (!disposed) setError('تعذر التحقق من اشتراك الإشعارات: ' + (e as Error).message);
      }
    };

    void syncSubscription();
    const onResume = () => {
      if (document.visibilityState === 'visible') void syncSubscription();
    };
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      disposed = true;
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, []);

  const enable = async () => {
    setError('');
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setError('لم يتم السماح بالإشعارات'); return; }
      const reg = await navigator.serviceWorker.ready;
      const kRes = await authFetch('/api/v1/notifications/push/public-key');
      if (!kRes.ok) { setError('فشل جلب مفتاح الإشعارات'); return; }
      const { publicKey, enabled } = await kRes.json();
      if (!enabled || !publicKey) { setError('الإشعارات غير مفعلة على الخادم'); return; }
      let sub = await reg.pushManager.getSubscription();
      if (sub && !subscriptionUsesKey(sub, publicKey)) {
        const removeResponse = await authFetch('/api/v1/notifications/push/unsubscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!removeResponse.ok) {
          setError('تعذر إزالة الاشتراك القديم من الخادم. أعد المحاولة.');
          return;
        }
        const removed = await sub.unsubscribe();
        if (!removed) {
          setError('تعذر إزالة الاشتراك القديم من هذا الجهاز.');
          return;
        }
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });
      }
      const json = sub.toJSON();
      const sRes = await authFetch('/api/v1/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, userAgent: navigator.userAgent }),
      });
      if (!sRes.ok) { setError('فشل حفظ الاشتراك'); return; }
      setSubscribed(true);
    } catch (e) {
      setError('خطأ: ' + (e as Error).message);
    } finally {
      // Always release the UI lock, including early returns and exceptions.
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const response = await authFetch('/api/v1/notifications/push/unsubscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!response.ok) {
          setError('تعذر إلغاء الاشتراك من الخادم. أعد المحاولة.');
          return;
        }
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError('خطأ: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return <div className="card bg-amber-500/10 border-amber-500/30"><p className="text-sm text-amber-400">⚠️ الإشعارات غير مدعومة في هذا المتصفح</p></div>;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${subscribed ? 'bg-emerald-500/20' : 'bg-[var(--brand-red)]/20'}`}>{subscribed ? '🔔' : '🔕'}</div>
        <div className="flex-1">
          <h3 className="font-black">{subscribed ? 'الإشعارات مفعلة' : 'فعّل الإشعارات'}</h3>
          <p className="text-xs text-[var(--text-muted)]">{subscribed ? 'ستصلك تنبيهات الطلبات' : 'إشعارات فورية حتى لو التطبيق مغلق'}</p>
        </div>
      </div>
      {error && <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30"><p className="text-xs text-red-400">{error}</p></div>}
      <button onClick={subscribed ? disable : enable} disabled={loading} className={`btn btn-full ${subscribed ? 'btn-ghost text-red-400' : 'btn-primary'}`}>
        {loading ? '⏳...' : subscribed ? '🔕 إيقاف' : '🔔 تفعيل'}
      </button>
      {permission === 'denied' && <p className="text-xs text-[var(--text-muted)] mt-2 text-center">افتح إعدادات المتصفح للسماح</p>}
    </div>
  );
}
