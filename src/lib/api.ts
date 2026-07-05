// ─── API Client ───
// Connects to Go backend. Set VITE_API_URL in .env or it defaults to /api

const BASE = import.meta.env.VITE_API_URL || '/api';

// If the page is loaded over HTTPS but the API URL is plain HTTP, the
// browser will silently block every request as "mixed content" — this
// happens before any network activity, so DevTools' Network tab shows
// nothing at all and the only trace is a console warning easy to miss.
// Surface it loudly and once, since this is the single most common cause
// of "the request never even reaches the backend."
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && BASE.startsWith('http://')) {
  // eslint-disable-next-line no-console
  console.error(
    `[API] This page is served over HTTPS but VITE_API_URL ("${BASE}") is plain HTTP.\n` +
    `Browsers block this as "mixed content" — every request will fail silently with no network activity.\n` +
    `Fix: serve the backend over HTTPS (e.g. behind an nginx/Caddy reverse proxy with a TLS certificate), ` +
    `then update VITE_API_URL to the https:// address.`
  );
}

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

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers });
  } catch (err) {
    // fetch() itself throwing (rather than resolving with a non-ok
    // response) means the request never reached the network at all —
    // wrong/unreachable host, CORS preflight rejection, mixed-content
    // block, DNS failure, etc. Label it clearly instead of surfacing
    // the browser's generic "Failed to fetch".
    const reason = window.location.protocol === 'https:' && BASE.startsWith('http://')
      ? `آدرس سرور (${BASE}) با HTTP است در حالی که این صفحه با HTTPS بارگذاری شده — مرورگر این درخواست را مسدود می‌کند (mixed content)`
      : `اتصال به سرور در آدرس ${BASE} برقرار نشد`;
    throw new Error(reason);
  }

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
  track: (trackingCode: string, phone: string) =>
    request<any>('/orders/track', { method: 'POST', body: JSON.stringify({ trackingCode, phone }) }),
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
