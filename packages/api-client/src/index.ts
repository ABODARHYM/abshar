import type {
  AuthResponse, User, City, Store, Product, Order,
  LoyaltyBalance, Reward, ReferralCode, ReferralStats,
  AppNotification, Paginated,
} from '@absher/shared-types';

const API_BASE = '/api/v1';

class HttpClient {
  private token: string | null = null;

  setToken(t: string | null) {
    this.token = t;
    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem('accessToken', t);
      else localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
    return this.token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as any) || {}),
    };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data as T;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: any) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }
  patch<T>(path: string, body?: any) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const http = new HttpClient();

export const auth = {
  register: (b: { email: string; phone: string; fullName: string; password: string }) =>
    http.post<AuthResponse>('/auth/register', b),
  login: (identifier: string, password: string) =>
    http.post<AuthResponse>('/auth/login', { identifier, password }),
  me: () => http.get<{ user: User }>('/auth/me'),
  logout: () => http.post('/auth/logout'),
};

export const geography = {
  cities: () => http.get<City[]>('/geography/cities'),
  districts: (cityId: string) => http.get<any[]>(`/geography/cities/${cityId}/districts`),
  areas: (districtId: string) => http.get<any[]>(`/geography/districts/${districtId}/areas`),
};

export const stores = {
  list: (params?: { cityId?: string; areaId?: string; categoryId?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.cityId) q.append('cityId', params.cityId);
    if (params?.areaId) q.append('areaId', params.areaId);
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    if (params?.search) q.append('search', params.search);
    return http.get<Paginated<Store>>(`/stores?${q}`);
  },
  get: (id: string) => http.get<Store>(`/stores/${id}`),
  products: (storeId: string) => http.get<Product[]>(`/products?storeId=${storeId}`),
};

export const orders = {
  create: (b: any) => http.post<Order>('/orders', b),
  my: () => http.get<Paginated<Order>>('/orders/my'),
  get: (id: string) => http.get<Order>(`/orders/my/${id}`),
  cancel: (id: string, reason: string) => http.patch(`/orders/my/${id}/cancel`, { reason }),
};

export const loyalty = {
  balance: () => http.get<LoyaltyBalance>('/loyalty/my/balance'),
  transactions: (page = 1, limit = 20) =>
    http.get(`/loyalty/my/transactions?page=${page}&limit=${limit}`),
  rewards: () => http.get<Reward[]>('/loyalty/rewards'),
  redeem: (rewardId: string) => http.post('/loyalty/redeem', { rewardId }),
};

export const referral = {
  myCode: () => http.get<ReferralCode>('/referral/my/code'),
  myStats: () => http.get<ReferralStats>('/referral/my/stats'),
  myInvites: () => http.get('/referral/my/invites'),
  validate: (code: string) => http.post('/referral/validate', { code }),
  apply: (code: string) => http.post('/referral/apply', { code }),
};

export const notifications = {
  list: (page = 1, limit = 20) =>
    http.get(`/notifications?page=${page}&limit=${limit}`),
  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
  delete: (id: string) => http.delete(`/notifications/${id}`),
};

export const profile = {
  get: () => http.get<User>('/profile'),
  update: (b: Partial<User>) => http.patch('/profile', b),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post('/profile/change-password', { oldPassword, newPassword }),
};
