const API = '/api/v1';
const AUTH_KEYS = ['accessToken', 'refreshToken', 'user'] as const;
let refreshing: Promise<string | null> | null = null;

/** يمسح بيانات الجلسة فقط (بدون حذف الثيم وبقية الإعدادات). */
export function clearSession(): void {
  for (const k of AUTH_KEYS) localStorage.removeItem(k);
}

async function refreshToken(): Promise<string | null> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) return null;

      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        clearSession();
        return null;
      }

      const data = await res.json();
      const newToken: string | undefined = data.tokens?.accessToken;
      if (newToken) {
        localStorage.setItem('accessToken', newToken);
        if (data.tokens?.refreshToken) {
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
      }
      return newToken ?? null;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const build = (token: string | null): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string> | undefined) ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  let res = await fetch(url, { ...options, headers: build(localStorage.getItem('accessToken')) });

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      res = await fetch(url, { ...options, headers: build(newToken) });
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return res;
}
