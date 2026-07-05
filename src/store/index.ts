import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type { Category, MenuItem, Order, CartItem, OrderStatus } from '@/types';
import { categoryApi, menuApi, orderApi, uploadApi } from '@/lib/api';

// ─── Price Formatter ───
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

// ─── Tracking Code Generator (client-side offline fallback) ───
// Matches the format the backend generates: 8 random characters, excluding
// visually-ambiguous ones (0/O, 1/I), so codes are unique, non-sequential,
// and safe to read back over the phone or print on a receipt.
const TRACKING_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTrackingCode(): string {
  let code = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) {
    code += TRACKING_CHARSET[bytes[i] % TRACKING_CHARSET.length];
  }
  return code;
}

// ─── Cart Store (client-side only) ───
interface CartStore {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (menuItem) => set((s) => {
    const ex = s.items.find(i => i.menuItem.id === menuItem.id);
    if (ex) return { items: s.items?.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i) };
    return { items: [...s.items, { menuItem, quantity: 1 }] };
  }),
  removeItem: (id) => set(s => ({ items: s.items?.filter(i => i.menuItem.id !== id) })),
  updateQuantity: (id, qty) => {
    if (qty <= 0) set(s => ({ items: s.items?.filter(i => i.menuItem.id !== id) }));
    else set(s => ({ items: s.items?.map(i => i.menuItem.id === id ? { ...i, quantity: qty } : i) }));
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0),
  getItemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));

// ─── App Store — API-connected with local cache ───
interface AppStore {
  // Data
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  theme: 'light' | 'dark';
  loading: boolean;
  loadingCount: number;
  apiOnline: boolean;

  // Fetch from API
  fetchCategories: () => Promise<void>;
  fetchMenuItems: () => Promise<void>;
  fetchOrders: () => Promise<void>;

  // Category CRUD
  addCategory: (data: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Menu CRUD
  addMenuItem: (data: Partial<MenuItem>) => Promise<void>;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;

  // Orders
  addOrder: (data: any) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => Promise<void>;
  trackOrder: (trackingCode: string, phone: string) => Promise<Order | null>;

  // Upload
  uploadImage: (file: File) => Promise<string>;

  // Theme
  toggleTheme: () => void;

  // Settings
  settings: { name: string; phone: string; email: string; address: string; };
  updateSettings: (s: Partial<AppStore['settings']>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      categories: [],
      menuItems: [],
      orders: [],
      theme: 'light',
      loading: false,
      loadingCount: 0,
      apiOnline: false,
      settings: { name: 'کافه COOL', phone: '۰۲۱-۱۲۳۴۵۶۷۸', email: 'info@coolcafe.ir', address: 'تهران، خیابان ولیعصر' },

      // ─── Fetch ───
      fetchCategories: async () => {
        try {
          const data = await categoryApi.list();
          set({ categories: Array.isArray(data) ? data : [], apiOnline: true });
        } catch {
          set({ apiOnline: false });
        }
      },
      fetchMenuItems: async () => {
        set(s => ({ loading: true, loadingCount: s.loadingCount + 1 }));
        try {
          const data = await menuApi.list(false);
          set({ menuItems: Array.isArray(data) ? data : [], apiOnline: true });
        } catch {
          set({ apiOnline: false });
        } finally {
          set(s => ({ loadingCount: s.loadingCount - 1, loading: s.loadingCount - 1 > 0 }));
        }
      },
      fetchOrders: async () => {
        set(s => ({ loading: true, loadingCount: s.loadingCount + 1 }));
        try {
          const res = await orderApi.list({ limit: 200 });
          set({ orders: Array.isArray(res?.orders) ? res.orders : [], apiOnline: true });
        } catch {
          set({ apiOnline: false });
        } finally {
          set(s => ({ loadingCount: s.loadingCount - 1, loading: s.loadingCount - 1 > 0 }));
        }
      },

      // ─── Categories ───
      addCategory: async (data) => {
        try {
          const created = await categoryApi.create(data);
          set(s => ({ categories: [...s.categories, created] }));
        } catch {
          // offline fallback
          const fake = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Category;
          set(s => ({ categories: [...s.categories, fake] }));
        }
      },
      updateCategory: async (id, data) => {
        try {
          const updated = await categoryApi.update(id, data);
          set(s => ({ categories: s.categories?.map(c => c.id === id ? { ...c, ...updated } : c) }));
        } catch {
          set(s => ({ categories: s.categories?.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c) }));
        }
      },
      deleteCategory: async (id) => {
        try { await categoryApi.delete(id); } catch { /* continue */ }
        set(s => ({ categories: s.categories?.filter(c => c.id !== id) }));
      },

      // ─── Menu Items ───
      addMenuItem: async (data) => {
        try {
          const created = await menuApi.create(data);
          set(s => ({ menuItems: [...s.menuItems, created] }));
        } catch {
          const fake = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as MenuItem;
          set(s => ({ menuItems: [...s.menuItems, fake] }));
        }
      },
      updateMenuItem: async (id, data) => {
        try {
          const updated = await menuApi.update(id, data);
          set(s => ({ menuItems: s.menuItems?.map(m => m.id === id ? { ...m, ...updated } : m) }));
        } catch {
          set(s => ({ menuItems: s.menuItems?.map(m => m.id === id ? { ...m, ...data } : m) }));
        }
      },
      deleteMenuItem: async (id) => {
        try { await menuApi.delete(id); } catch { /* continue */ }
        set(s => ({ menuItems: s.menuItems?.filter(m => m.id !== id) }));
      },

      // ─── Orders ───
      addOrder: async (orderData) => {
        try {
          const created = await orderApi.create(orderData);
          set(s => ({ orders: [created, ...s.orders] }));
          return created;
        } catch (err) {
          // The backend genuinely could not be reached (wrong API URL,
          // server down, CORS, network drop, etc). We still keep the
          // order locally so the cashier/customer doesn't lose their
          // work, but we tag it and rethrow so the UI can clearly warn
          // that this order was NOT saved to the server and will need
          // to be re-entered or synced manually — silently pretending
          // success here is exactly what was hiding real failures.
          const now = new Date().toISOString();
          const fake: Order = {
            ...orderData,
            id: crypto.randomUUID(),
            orderNumber: `COOL-${dayjs().format('YYMMDD')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
            trackingCode: generateTrackingCode(),
            timeline: [{ status: 'pending', timestamp: now }],
            createdAt: now, updatedAt: now,
            _unsynced: true,
          } as Order;
          set(s => ({ orders: [fake, ...s.orders], apiOnline: false }));
          const message = err instanceof Error ? err.message : 'اتصال به سرور برقرار نشد';
          const syncError = new Error(message) as Error & { order?: Order };
          syncError.order = fake;
          throw syncError;
        }
      },
      updateOrderStatus: async (id, status, note) => {
        try {
          await orderApi.updateStatus(id, status, note);
        } catch { /* continue */ }
        const now = new Date().toISOString();
        set(s => ({
          orders: s.orders?.map(o => o.id === id ? {
            ...o, status, updatedAt: now,
            timeline: [...(o.timeline || []), { status, timestamp: now, note }],
          } : o),
        }));
      },

      // ─── Track (public, no auth) ───
      trackOrder: async (trackingCode, phone) => {
        const code = trackingCode.trim().toUpperCase();
        const cleanPhone = phone.trim();
        try {
          const order = await orderApi.track(code, cleanPhone);
          return order ?? null;
        } catch {
          // Offline fallback: search the locally cached orders.
          const match = _get().orders?.find(
            o => o.trackingCode?.toUpperCase() === code && o.customerPhone === cleanPhone
          );
          return match ?? null;
        }
      },

      // ─── Upload ───
      uploadImage: async (file: File) => {
        try {
          const url = await uploadApi.upload(file);
          return url;
        } catch {
          // fallback: convert to base64
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
      },

      // ─── Theme ───
      toggleTheme: () => set(s => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        if (next === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { theme: next };
      }),

      // ─── Settings ───
      updateSettings: (data) => set(s => ({ settings: { ...s.settings, ...data } })),
    }),
    {
      name: 'cool-cafe-storage',
      partialize: (s) => ({
        categories: s.categories,
        menuItems: s.menuItems,
        orders: s.orders,
        theme: s.theme,
        settings: s.settings,
      }),
      // Guard against corrupted/legacy cached data (e.g. `null` instead of `[]`
      // from an older API response) so the very first render — before fetch*
      // effects run — never crashes on .filter/.map/.length of a non-array.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppStore>;
        return {
          ...currentState,
          ...persisted,
          categories: Array.isArray(persisted.categories) ? persisted.categories : [],
          menuItems: Array.isArray(persisted.menuItems) ? persisted.menuItems : [],
          orders: Array.isArray(persisted.orders) ? persisted.orders : [],
        };
      },
    }
  )
);
