// ─── API Client ───
// Connects to Go backend. Set VITE_API_URL in .env or it defaults to /api

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('cool-cafe-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch { return null; }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; name: string; role: 'admin' | 'cashier' } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ id: string; username: string; name: string; role: string }>('/auth/me'),
};

// ─── Categories ───
export const categoryApi = {
  list: () => request<any[]>('/categories'),
  create: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

// ─── Menu Items ───
export const menuApi = {
  list: (availableOnly = false) => request<any[]>(`/menu${availableOnly ? '?available=true' : '?available=false'}`),
  get: (id: string) => request<any>(`/menu/${id}`),
  create: (data: any) => request<any>('/menu', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/menu/${id}`, { method: 'DELETE' }),
};

// ─── Orders ───
export const orderApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<{ orders: any[]; total: number }>(`/orders?${q}`);
  },
  get: (id: string) => request<any>(`/orders/${id}`),
  create: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string, note?: string) =>
    request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
};

// ─── Upload ───
// Returns full URL: if backend gives /uploads/xxx.jpg, prepend the API host
export const uploadApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await request<{ url: string }>('/upload', { method: 'POST', body: formData });
    // If API returns relative path, make it absolute using the API host
    if (res.url.startsWith('/')) {
      const apiHost = BASE.replace('/api', '');
      return apiHost + res.url;
    }
    return res.url;
  },
};
