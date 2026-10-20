const API = '/api/v1';

let refreshing: Promise<string | null> | null = null;

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
        localStorage.clear();
        return null;
      }

      const data = await res.json();
      const newToken = data.tokens?.accessToken;
      if (newToken) {
        localStorage.setItem('accessToken', newToken);
        if (data.tokens?.refreshToken) {
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
      }
      return newToken || null;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    console.log('[Auth] 401 - refreshing...');
    const newToken = await refreshToken();

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    } else {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
  }

  return res;
}
