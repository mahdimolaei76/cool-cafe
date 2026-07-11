import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';
import type { Category, MenuItem, Order, CartItem, OrderStatus, Customer } from '@/types';
import { categoryApi, menuApi, orderApi, settingsApi, uploadApi, customerApi, uuidGenerator } from '@/lib/api';

// ─── Price Formatter ───
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

// For display anywhere a MenuItem's price is shown: variable-price items
// don't have a real number yet, so show their description instead of "۰
// تومان" (which was confusing admins into thinking the item was free).
export function formatItemPrice(item: MenuItem): string {
  if (item.priceType === 'variable') return item.priceLabel || 'قیمت توصیفی';
  return formatPrice(item.price);
}

// ─── Tracking Code Generator (client-side offline fallback) ───
// Matches the format the backend generates: 8 random characters, excluding
// visually-ambiguous ones (0/O, 1/I), so codes are unique, non-sequential,
// and safe to read back over the phone or print on a receipt.
const TRACKING_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTrackingCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += TRACKING_CHARSET[Math.floor(Math.random() * TRACKING_CHARSET.length)];
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
  getVariablePriceItems: () => CartItem[];
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
  getTotal: () => get().items.reduce((s, i) => s + (i.menuItem.priceType === 'variable' ? 0 : i.menuItem.price) * i.quantity, 0),
  getItemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
  getVariablePriceItems: () => get().items.filter(i => i.menuItem.priceType === 'variable'),
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
  reorderCategories: (orderedIds: string[]) => Promise<void>;

  // Menu CRUD
  addMenuItem: (data: Partial<MenuItem>) => Promise<void>;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;

  // Orders
  addOrder: (data: any) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => Promise<void>;
  updateOrderItemPrice: (orderId: string, itemId: string, price: number) => Promise<void>;
  updateOrderPayment: (orderId: string, data: { paymentMethod: string; isPaid: boolean; paidByCredit: boolean }) => Promise<void>;
  trackOrder: (trackingCode: string, phone: string) => Promise<Order | null>;

  // مدیریت مشتری‌ها (پرداخت اعتباری)
  customers: Customer[];
  customersTotal: number;
  fetchCustomers: (params?: { search?: string; page?: number; pageSize?: number }) => Promise<void>;
  addCustomer: (data: { phone: string; firstName: string; lastName: string; creditEnabled: boolean }) => Promise<Customer>;
  updateCustomer: (id: string, data: { phone: string; firstName: string; lastName: string; creditEnabled: boolean }) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Upload
  uploadImage: (file: File) => Promise<string>;

  // Theme
  toggleTheme: () => void;

  // Settings
  settings: { name: string; phone: string; email: string; address: string; workingHours: string; aboutText: string; };
  fetchSettings: () => Promise<void>;
  updateSettings: (s: Partial<AppStore['settings']>) => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      categories: [],
      menuItems: [],
      orders: [],
      customers: [],
      customersTotal: 0,
      theme: 'light',
      loading: false,
      loadingCount: 0,
      apiOnline: false,
      settings: {
        name: 'کافه COOL',
        phone: '۰۲۱-۱۲۳۴۵۶۷۸',
        email: 'info@coolcafe.ir',
        address: 'تهران، خیابان ولیعصر',
        workingHours: '۷ صبح تا ۱۰ شب',
        aboutText: 'کافه COOL با هدف ارائه بهترین تجربه نوشیدنی و غذا در فضایی گرم و صمیمی راه‌اندازی شده است.',
      },

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
          const fake = { ...data, id: uuidGenerator(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Category;
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
      reorderCategories: async (orderedIds) => {
        // Optimistically apply the new order locally first so the UI feels
        // instant, then sync sort_order with the backend in one atomic
        // request. If the request fails, re-fetch to resync with the server
        // instead of leaving the client in a state that only *looks* reordered.
        set(s => ({
          categories: orderedIds
            .map((id, idx) => {
              const cat = s.categories.find(c => c.id === id);
              return cat ? { ...cat, order: idx } : null;
            })
            .filter(Boolean) as Category[],
        }));
        try {
          await categoryApi.reorder(orderedIds);
        } catch {
          await _get().fetchCategories();
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
          const fake = { ...data, id: uuidGenerator(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as MenuItem;
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

      // ─── Customers (پرداخت اعتباری) ───
      // Unlike categories/menu items, customer data involves real debt/
      // credit balances — there's no safe offline fallback for these, so
      // failures are surfaced (thrown) instead of silently faked locally.
      fetchCustomers: async (params) => {
        set(s => ({ loading: true, loadingCount: s.loadingCount + 1 }));
        try {
          const data = await customerApi.list(params);
          set({ customers: Array.isArray(data?.customers) ? data.customers : [], customersTotal: data?.total ?? 0 });
        } finally {
          set(s => ({ loadingCount: s.loadingCount - 1, loading: s.loadingCount - 1 > 0 }));
        }
      },
      addCustomer: async (data) => {
        const created = await customerApi.create(data);
        set(s => ({ customers: [created, ...s.customers] }));
        return created;
      },
      updateCustomer: async (id, data) => {
        const updated = await customerApi.update(id, data);
        set(s => ({ customers: s.customers?.map(c => c.id === id ? { ...c, ...updated } : c) }));
        return updated;
      },
      deleteCustomer: async (id) => {
        await customerApi.delete(id);
        set(s => ({ customers: s.customers?.filter(c => c.id !== id) }));
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
            id: uuidGenerator(),
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
        // Unlike other offline-tolerant actions, a status change (especially
        // to "delivered") can be *rejected* by the backend on purpose (e.g.
        // "must be paid before delivery") — swallowing that error would let
        // the UI optimistically show the order as delivered anyway, which is
        // exactly the case we need to prevent.
        const updated = await orderApi.updateStatus(id, status, note);
        set(s => ({
          orders: s.orders?.map(o => o.id === id ? { ...o, ...updated } : o),
        }));
      },

      updateOrderItemPrice: async (orderId, itemId, price) => {
        // Propagate errors (e.g. the order was delivered/cancelled and is
        // now locked) instead of silently applying the change locally.
        const updated = await orderApi.updateItemPrice(orderId, itemId, price);
        set(s => ({
          orders: s.orders?.map(o => o.id === orderId ? { ...o, ...updated } : o),
        }));
      },

      updateOrderPayment: async (orderId, data) => {
        const updated = await orderApi.updatePayment(orderId, data);
        set(s => ({
          orders: s.orders?.map(o => o.id === orderId ? { ...o, ...updated } : o),
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
      fetchSettings: async () => {
        try {
          const data = await settingsApi.get();
          set(s => ({
            settings: {
              name: data?.name ?? s.settings.name,
              phone: data?.phone ?? s.settings.phone,
              email: data?.email ?? s.settings.email,
              address: data?.address ?? s.settings.address,
              workingHours: data?.workingHours ?? s.settings.workingHours,
              aboutText: data?.aboutText ?? s.settings.aboutText,
            },
            apiOnline: true,
          }));
        } catch {
          // offline: keep whatever was last cached locally
          set({ apiOnline: false });
        }
      },
      updateSettings: async (data) => {
        // Optimistic local update so the UI feels instant even if the
        // request is slow or fails.
        set(s => ({ settings: { ...s.settings, ...data } }));
        const merged = { ...(_get() as AppStore).settings, ...data };
        await settingsApi.update(merged);
      },
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
      // Belt-and-suspenders for the light/dark toggle on mobile: rather
      // than waiting for React to mount and run the App-level useEffect
      // (which reacts to `theme` changes), apply the class to <html> the
      // moment zustand finishes rehydrating from localStorage. This closes
      // any timing gap on slower devices where the theme could otherwise
      // render with the wrong class for a frame or two, or get stuck if
      // the effect fires before hydration completes.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      },
    }
  )
);
