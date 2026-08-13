// ─── API Client ───
// Connects to Go backend. Set VITE_API_URL in .env or it defaults to /api

export function uuidGenerator() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const BASE = import.meta.env.VITE_API_URL || '/api';

if (typeof window !== 'undefined' && window.location.protocol === 'https:' && BASE.startsWith('http://')) {
  console.error(
    `[API] This page is served over HTTPS but VITE_API_URL ("${BASE}") is plain HTTP.\n` +
    `Browsers block this as "mixed content" — every request will fail silently with no network activity.\n` +
    `Fix: serve the backend over HTTPS then update VITE_API_URL to the https:// address.`
  );
}

// ─── Token Helpers ───
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('cool-cafe-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch { return null; }
}

function getRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem('cool-cafe-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.refreshToken || null;
  } catch { return null; }
}

// ─── Refresh Token State ───
// یک promise مشترک برای جلوگیری از چندین درخواست refresh همزمان
let refreshPromise: Promise<string | null> | null = null;

async function doRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // اگر refresh هم خطا داد (401 یا غیره) → null برمی‌گردونه تا logout بشه
      return null;
    }

    const data = await res.json();
    const newToken = data.token;
    const newRefreshToken = data.refreshToken;

    // توکن جدید رو در localStorage ذخیره کن
    try {
      const raw = localStorage.getItem('cool-cafe-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.token = newToken;
          if (newRefreshToken) parsed.state.refreshToken = newRefreshToken;
          localStorage.setItem('cool-cafe-auth', JSON.stringify(parsed));
        }
      }
    } catch { /* ignore */ }

    return newToken;
  } catch {
    return null;
  }
}

async function tryRefreshToken(): Promise<string | null> {
  // از چندین refresh موازی جلوگیری کن
  if (!refreshPromise) {
    refreshPromise = doRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Redirect to Login ───
function redirectToLogin() {
  // State رو پاک کن
  try {
    const raw = localStorage.getItem('cool-cafe-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        parsed.state.token = null;
        parsed.state.refreshToken = null;
        parsed.state.user = null;
        parsed.state.isAuthenticated = false;
        localStorage.setItem('cool-cafe-auth', JSON.stringify(parsed));
      }
    }
  } catch { /* ignore */ }

  // به صفحه لاگین هدایت کن
  if (typeof window !== 'undefined') {
    const current = window.location.pathname;
    // فقط اگه توی پنل ادمین/صندوقدار هستیم redirect بده
    if (current.startsWith('/admin') || current.startsWith('/cashier')) {
      window.location.href = '/admin/login';
    }
  }
}

// ─── Toast Helper (lazy import to avoid circular dependency) ───
// این رو از sonner مستقیم import میکنیم
let _toast: typeof import('sonner').toast | null = null;
async function getToast() {
  if (!_toast) {
    const sonner = await import('sonner');
    _toast = sonner.toast;
  }
  return _toast;
}

// ─── Core Request ───
async function request<T>(
  path: string,
  opts: RequestInit = {},
  toastOptions?: {
    loading?: string;
    success?: string;
    error?: string | false; // false = suppress error toasts
  }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  // نمایش toast در حال بارگذاری
  let toastId: string | number | undefined;
  if (toastOptions?.loading) {
    const t = await getToast();
    toastId = t.loading(toastOptions.loading);
  }

  const executeRequest = async (authToken: string | null): Promise<Response> => {
    const hdrs = { ...headers };
    if (authToken) hdrs['Authorization'] = `Bearer ${authToken}`;
    try {
      return await fetch(`${BASE}${path}`, { ...opts, headers: hdrs });
    } catch (err) {
      const reason = window.location.protocol === 'https:' && BASE.startsWith('http://')
        ? `آدرس سرور (${BASE}) با HTTP است در حالی که صفحه با HTTPS بارگذاری شده`
        : `اتصال به سرور در آدرس ${BASE} برقرار نشد`;
      throw new Error(reason);
    }
  };

  try {
    let res = await executeRequest(token);

    // ─── 403: توکن منقضی شده → refresh کن ───
    if (res.status === 403) {
      const newToken = await tryRefreshToken();

      if (newToken) {
        // با توکن جدید درخواست رو تکرار کن
        res = await executeRequest(newToken);
      } else {
        // refresh هم کار نکرد → به لاگین برو
        if (toastId !== undefined) {
          const t = await getToast();
          t.dismiss(toastId);
        }
        const t = await getToast();
        t.error('نشست شما منقضی شده. لطفاً دوباره وارد شوید.');
        redirectToLogin();
        throw new Error('session_expired');
      }
    }

    // ─── 401: غیر مجاز → به لاگین برو ───
    if (res.status === 401) {
      if (toastId !== undefined) {
        const t = await getToast();
        t.dismiss(toastId);
      }
      const t = await getToast();
      t.error('دسترسی غیر مجاز. لطفاً وارد شوید.');
      redirectToLogin();
      throw new Error('unauthorized');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = body.message || `HTTP ${res.status}`;
      throw new Error(message);
    }

    if (toastId !== undefined) {
      const t = await getToast();
      if (toastOptions?.success) {
        t.success(toastOptions.success, { id: toastId });
      } else {
        t.dismiss(toastId);
      }
    } else if (toastOptions?.success) {
      const t = await getToast();
      t.success(toastOptions.success);
    }

    if (res.status === 204) return undefined as T;
    return res.json();

  } catch (err) {
    if (err instanceof Error && (err.message === 'session_expired' || err.message === 'unauthorized')) {
      throw err;
    }

    if (toastId !== undefined) {
      const t = await getToast();
      if (toastOptions?.error !== false) {
        const msg = toastOptions?.error || (err instanceof Error ? err.message : 'خطای ناشناخته');
        t.error(msg, { id: toastId });
      } else {
        t.dismiss(toastId);
      }
    } else if (toastOptions?.error && toastOptions.error !== false) {
      const t = await getToast();
      t.error(toastOptions.error);
    }

    throw err;
  }
}

// ─── Auth ───
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; refreshToken: string; user: { id: string; username: string; name: string; role: 'admin' | 'cashier' } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),
  refresh: (refreshToken: string) =>
    request<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken }),
    }),
  me: () => request<{ id: string; username: string; name: string; role: string }>('/auth/me'),
};

// ─── Categories ───
export const categoryApi = {
  list: () => request<any[]>('/categories'),
  create: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) },
    { loading: 'در حال افزودن دسته‌بندی...', success: 'دسته‌بندی با موفقیت اضافه شد', error: 'خطا در افزودن دسته‌بندی' }),
  update: (id: string, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) },
    { loading: 'در حال ویرایش...', success: 'دسته‌بندی ویرایش شد', error: 'خطا در ویرایش دسته‌بندی' }),
  delete: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' },
    { loading: 'در حال حذف...', success: 'دسته‌بندی حذف شد', error: 'خطا در حذف دسته‌بندی' }),
  reorder: (ids: string[]) => request<any[]>('/categories/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
};

// ─── Menu Items ───
export const menuApi = {
  list: (availableOnly = false) => request<any[]>(`/menu${availableOnly ? '?available=true' : '?available=false'}`),
  get: (id: string) => request<any>(`/menu/${id}`),
  byCategory: (categoryId: string) => request<any[]>(`/menu/by-category/${categoryId}`),
  create: (data: any) => request<any>('/menu', { method: 'POST', body: JSON.stringify(data) },
    { loading: 'در حال افزودن آیتم...', success: 'آیتم منو اضافه شد ✓', error: 'خطا در افزودن آیتم' }),
  update: (id: string, data: any) => request<any>(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) },
    { loading: 'در حال ذخیره...', success: 'آیتم منو ویرایش شد ✓', error: 'خطا در ویرایش آیتم' }),
  delete: (id: string) => request<void>(`/menu/${id}`, { method: 'DELETE' },
    { loading: 'در حال حذف...', success: 'آیتم حذف شد', error: 'خطا در حذف آیتم' }),
  reorder: (ids: string[]) => request<void>('/menu/reorder', { method: 'PATCH', body: JSON.stringify({ ids }) }),
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
  create: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) },
    { loading: 'در حال ثبت سفارش...', success: 'سفارش با موفقیت ثبت شد 🎉', error: 'خطا در ثبت سفارش' }),
  updateStatus: (id: string, status: string, note?: string) =>
    request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) },
      { loading: 'در حال به‌روزرسانی وضعیت...', success: 'وضعیت سفارش تغییر کرد ✓', error: 'خطا در تغییر وضعیت' }),
  updateItemPrice: (orderId: string, itemId: string, price: number) =>
    request<any>(`/orders/${orderId}/items/${itemId}/price`, { method: 'PATCH', body: JSON.stringify({ price }) },
      { success: 'قیمت آیتم ویرایش شد', error: 'خطا در ویرایش قیمت' }),
  updatePayment: (orderId: string, data: { paymentMethod: string; isPaid: boolean; paidByCredit: boolean }) =>
    request<any>(`/orders/${orderId}/payment`, { method: 'PATCH', body: JSON.stringify(data) },
      { loading: 'در حال ثبت پرداخت...', success: 'اطلاعات پرداخت ثبت شد ✓', error: 'خطا در ثبت پرداخت' }),
  updateTotal: (id: string, total: number, cashier = '') =>
    request<any>(`/orders/${id}/total`, { method: 'PATCH', body: JSON.stringify({ total, cashier }) },
      { success: 'مبلغ کل ویرایش شد', error: 'خطا در ویرایش مبلغ' }),
  updateServiceCharge: (id: string, serviceCharge: number, cashier = '') =>
    request<any>(`/orders/${id}/service-charge`, { method: 'PATCH', body: JSON.stringify({ serviceCharge, cashier }) },
      { success: 'سرویس سفارش ویرایش شد', error: 'خطا' }),
  updateTakeaway: (id: string, isTakeaway: boolean, cashier = '') =>
    request<any>(`/orders/${id}/takeaway`, { method: 'PATCH', body: JSON.stringify({ isTakeaway, cashier }) },
      { success: 'نوع سفارش ویرایش شد', error: 'خطا' }),
  updateStaffNote: (id: string, staffNote: string) =>
    request<any>(`/orders/${id}/staff-note`, { method: 'PATCH', body: JSON.stringify({ staffNote }) },
      { success: 'یادداشت ذخیره شد', error: 'خطا در ذخیره یادداشت' }),
  updateItemServiceCharge: (orderId: string, itemId: string, serviceCharge: number, cashier = '') =>
    request<any>(`/orders/${orderId}/items/${itemId}/service-charge`, { method: 'PATCH', body: JSON.stringify({ serviceCharge, cashier }) },
      { success: 'سرویس آیتم ویرایش شد', error: 'خطا' }),
  track: (trackingCode: string, phone: string) =>
    request<any>('/orders/track', { method: 'POST', body: JSON.stringify({ trackingCode, phone }) }),
};

// ─── Customers ───
export const customerApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    return request<{ customers: any[]; total: number }>(`/customers?${q}`);
  },
  get: (id: string) => request<any>(`/customers/${id}`),
  history: (id: string, params?: { page?: number; pageSize?: number; dateFrom?: string; dateTo?: string; paymentMethod?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);
    return request<any>(`/customers/${id}/history?${q}`);
  },
  lookup: (phone: string) => request<any>(`/customers/lookup?phone=${encodeURIComponent(phone)}`),
  create: (data: { phone: string; firstName: string; lastName: string; creditEnabled: boolean }) =>
    request<any>('/customers', { method: 'POST', body: JSON.stringify(data) },
      { loading: 'در حال افزودن مشتری...', success: 'مشتری اضافه شد ✓', error: 'خطا در افزودن مشتری' }),
  update: (id: string, data: { phone: string; firstName: string; lastName: string; creditEnabled: boolean }) =>
    request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) },
      { loading: 'در حال ذخیره...', success: 'اطلاعات مشتری ویرایش شد ✓', error: 'خطا در ویرایش مشتری' }),
  delete: (id: string) => request<void>(`/customers/${id}`, { method: 'DELETE' },
    { loading: 'در حال حذف...', success: 'مشتری حذف شد', error: 'خطا در حذف مشتری' }),
  adjustCredit: (id: string, kind: 'increase' | 'purchase' | 'settle', amount: number) =>
    request<any>(`/customers/${id}/credit-adjustment`, { method: 'POST', body: JSON.stringify({ kind, amount }) },
      { loading: 'در حال ثبت تراکنش...', success: 'تراکنش با موفقیت ثبت شد ✓', error: 'خطا در ثبت تراکنش' }),
};

// ─── Settings ───
export const settingsApi = {
  get: () => request<any>('/settings'),
  update: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) },
      { loading: 'در حال ذخیره تنظیمات...', success: 'تنظیمات ذخیره شد ✓', error: 'خطا در ذخیره تنظیمات' }),
};

// ─── Upload ───
export const uploadApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await request<{ url: string }>('/upload', { method: 'POST', body: formData },
      { loading: 'در حال آپلود تصویر...', success: 'تصویر آپلود شد ✓', error: 'خطا در آپلود تصویر' });
    if (res.url.startsWith('/')) {
      const apiHost = BASE.replace('/api', '');
      return apiHost + res.url;
    }
    return res.url;
  },
};

// ─── Default Menu Images ───
// لیست عکس‌های پیش‌فرض از پوشه public/images/defaultMenuImages
export async function fetchDefaultMenuImages(): Promise<{ value: string; label: string }[]> {
  try {
    // یک endpoint از بک‌اند که لیست فایل‌ها رو میده
    const res = await request<{ images: string[] }>('/menu/default-images');
    return res.images.map(filename => ({
      value: `/images/defaultMenuImages/${filename}`,
      label: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
    }));
  } catch {
    // Fallback: اگه بک‌اند این endpoint رو نداره، از لیست پیش‌فرض استاتیک استفاده کن
    // و همچنین تلاش کن از طریق manifest یا درخواست مستقیم چک کنه
    return fallbackDefaultImages();
  }
}

// فالبک محلی — وقتی بک‌اند endpoint نداره
// این تابع یک درخواست به index پوشه می‌زنه تا ببینه چی هست
async function fallbackDefaultImages(): Promise<{ value: string; label: string }[]> {
  try {
    // تلاش برای خواندن manifest.json از پوشه
    const res = await fetch('/images/defaultMenuImages/manifest.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((filename: string) => ({
          value: `/images/defaultMenuImages/${filename}`,
          label: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        }));
      }
    }
  } catch { /* ignore */ }

  // آخرین فالبک: لیست هاردکد شده پیش‌فرض
  const defaults = [
    { value: '/images/defaultMenuImages/coffee-hot.jpg', label: 'قهوه گرم' },
    { value: '/images/defaultMenuImages/coffee-cold.jpg', label: 'قهوه سرد' },
    { value: '/images/defaultMenuImages/cake.jpg', label: 'کیک' },
    { value: '/images/defaultMenuImages/pastry.jpg', label: 'شیرینی' },
    { value: '/images/defaultMenuImages/breakfast.jpg', label: 'صبحانه' },
  ];
  return defaults;
}
