import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { Category, MenuItem, Order, OrderItem, CartItem, OrderStatus, OrderType, PaymentMethod, CafeSettings, OrderTimeline } from '@/types';

// ============================================================
// PERSIAN SEED DATA
// ============================================================

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'قهوه گرم', slug: 'hot-coffee', icon: '☕', order: 1, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-2', name: 'قهوه سرد', slug: 'cold-coffee', icon: '🧊', order: 2, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-3', name: 'چای و دمنوش', slug: 'tea-herbal', icon: '🍵', order: 3, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-4', name: 'کیک', slug: 'cakes', icon: '🎂', order: 4, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-5', name: 'دسر', slug: 'desserts', icon: '🍰', order: 5, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-6', name: 'شیرینی', slug: 'pastries', icon: '🥐', order: 6, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-7', name: 'صبحانه', slug: 'breakfast', icon: '🍳', order: 7, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-8', name: 'اسنک', slug: 'snacks', icon: '🥪', order: 8, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'cat-9', name: 'نوشیدنی سرد', slug: 'cold-drinks', icon: '🥤', order: 9, isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const defaultMenuItems: MenuItem[] = [
  { id: 'item-1', name: 'اسپرسو', description: 'اسپرسو غلیظ و قوی با طعم عالی از دانه‌های مرغوب', price: 45000, categoryId: 'cat-1', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-2', name: 'کاپوچینو', description: 'ترکیب عالی اسپرسو، شیر بخار داده و کف شیر نرم', price: 65000, categoryId: 'cat-1', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-3', name: 'لاته', description: 'اسپرسو همراه با شیر بخار داده و هنر لاته', price: 70000, categoryId: 'cat-1', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-4', name: 'آمریکانو', description: 'اسپرسو رقیق شده با آب گرم، طعمی ملایم و دلپذیر', price: 50000, categoryId: 'cat-1', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-5', name: 'موکا', description: 'اسپرسو با شکلات بلژیکی و شیر، تاپینگ خامه', price: 75000, categoryId: 'cat-1', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-6', name: 'آیس لاته', description: 'اسپرسو سرد با شیر و یخ، خنک و دلچسب', price: 75000, categoryId: 'cat-2', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-7', name: 'کلد برو', description: 'قهوه دم سرد ۲۰ ساعته، طعمی نرم و طبیعی', price: 80000, categoryId: 'cat-2', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-8', name: 'آیس آمریکانو', description: 'اسپرسو دوبل روی یخ با آب سرد', price: 60000, categoryId: 'cat-2', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-9', name: 'فراپه', description: 'نوشیدنی مخلوط شده با یخ، قهوه و خامه', price: 85000, categoryId: 'cat-2', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-10', name: 'چای سبز', description: 'چای سبز ژاپنی سنچا، سبک و معطر', price: 40000, categoryId: 'cat-3', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-11', name: 'چای ارل گری', description: 'چای سیاه با عطر برگاموت', price: 40000, categoryId: 'cat-3', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-12', name: 'دمنوش بابونه', description: 'دمنوش گیاهی آرامش‌بخش با عسل', price: 45000, categoryId: 'cat-3', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-13', name: 'کیک شکلاتی', description: 'کیک سه لایه شکلاتی با گاناش تلخ', price: 95000, categoryId: 'cat-4', image: '/images/cake.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-14', name: 'رد ولوت', description: 'کیک قرمز مخملی با کرم پنیری', price: 95000, categoryId: 'cat-4', image: '/images/cake.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-15', name: 'چیزکیک', description: 'چیزکیک نیویورکی با بیسکوئیت کره‌ای', price: 110000, categoryId: 'cat-4', image: '/images/cake.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-16', name: 'تیرامیسو', description: 'دسر ایتالیایی با قهوه، ماسکارپونه و کاکائو', price: 90000, categoryId: 'cat-5', image: '/images/cake.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-17', name: 'کرم بروله', description: 'کاستارد وانیلی با رویه کارامل', price: 85000, categoryId: 'cat-5', image: '/images/cake.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-18', name: 'کروسان', description: 'کروسان تازه کره‌ای با لایه‌های طلایی', price: 55000, categoryId: 'cat-6', image: '/images/pastry.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-19', name: 'پن او شکلا', description: 'شیرینی ورقه‌ای با مغز شکلات تلخ بلژیکی', price: 60000, categoryId: 'cat-6', image: '/images/pastry.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-20', name: 'دنیش', description: 'شیرینی دانمارکی با میوه فصل و گلیز وانیل', price: 55000, categoryId: 'cat-6', image: '/images/pastry.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-21', name: 'تست آووکادو', description: 'نان تست با آووکادو، گوجه و سبزیجات تازه', price: 120000, categoryId: 'cat-7', image: '/images/breakfast.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-22', name: 'تخم مرغ بندیکت', description: 'تخم مرغ پوچ با سس هلندز و سالمون دودی', price: 145000, categoryId: 'cat-7', image: '/images/breakfast.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-23', name: 'بول گرانولا', description: 'گرانولا خانگی با ماست یونانی و میوه‌های تازه', price: 95000, categoryId: 'cat-7', image: '/images/breakfast.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-24', name: 'کلاب ساندویچ', description: 'ساندویچ سه لایه با مرغ، بیکن و سبزیجات', price: 135000, categoryId: 'cat-8', image: '/images/breakfast.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-25', name: 'سالاد سزار', description: 'کاهو رومی با پارمزان، کروتون و سس سزار خانگی', price: 110000, categoryId: 'cat-8', image: '/images/breakfast.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-26', name: 'آب پرتقال تازه', description: 'آب پرتقال تازه فشرده شده', price: 70000, categoryId: 'cat-9', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-27', name: 'لیموناد', description: 'لیموناد خانگی با نعناع و عسل', price: 60000, categoryId: 'cat-9', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'item-28', name: 'اسموتی بول', description: 'آساای و توت‌های ترکیبی با تاپینگ گرانولا', price: 125000, categoryId: 'cat-9', image: '/images/coffee-cold.jpg', isAvailable: true, isFeatured: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

function generateOrderHistory(): Order[] {
  const orders: Order[] = [];
  const statuses: OrderStatus[] = ['delivered', 'delivered', 'delivered', 'delivered', 'cancelled', 'delivered', 'preparing', 'pending', 'ready'];
  const types: OrderType[] = ['in-person', 'online', 'in-person', 'online', 'in-person'];
  const payments: PaymentMethod[] = ['cash', 'card', 'card', 'cash', 'card'];
  const cashiers = ['علی', 'مریم', 'سارا', 'رضا'];
  const firstNames = ['علی', 'محمد', 'سارا', 'مریم', 'رضا', 'زهرا', 'حسین', 'فاطمه', 'امیر', 'نازنین', 'مهدی', 'لیلا', 'احمد', 'نسرین', 'پویا'];
  const lastNames = ['محمدی', 'احمدی', 'رضایی', 'حسینی', 'کریمی', 'موسوی', 'جعفری', 'صادقی', 'نجفی', 'اکبری'];

  for (let i = 0; i < 75; i++) {
    const d = dayjs().subtract(Math.floor(Math.random() * 30), 'day').subtract(Math.floor(Math.random() * 12), 'hour');
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const numItems = Math.floor(Math.random() * 4) + 1;
    const items: OrderItem[] = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const mi = defaultMenuItems[Math.floor(Math.random() * defaultMenuItems.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const sub = mi.price * qty;
      subtotal += sub;
      items.push({ id: uuidv4(), menuItemId: mi.id, menuItem: mi, name: mi.name, price: mi.price, quantity: qty, subtotal: sub });
    }
    const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    const timeline: OrderTimeline[] = [{ status: 'pending', timestamp: d.toISOString() }];
    if (['preparing', 'ready', 'delivered'].includes(status)) timeline.push({ status: 'preparing', timestamp: d.add(5, 'minute').toISOString() });
    if (['ready', 'delivered'].includes(status)) timeline.push({ status: 'ready', timestamp: d.add(15, 'minute').toISOString() });
    if (status === 'delivered') timeline.push({ status: 'delivered', timestamp: d.add(20, 'minute').toISOString() });
    if (status === 'cancelled') timeline.push({ status: 'cancelled', timestamp: d.add(3, 'minute').toISOString(), note: 'لغو توسط مشتری' });

    orders.push({
      id: uuidv4(),
      orderNumber: `COOL-${String(1000 + i).padStart(4, '0')}`,
      customerFirstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      customerLastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      customerPhone: `۰۹۱۲${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
      items,
      subtotal,
      discount,
      total,
      notes: Math.random() > 0.7 ? 'شکر کمتر لطفاً' : '',
      status,
      orderType: types[Math.floor(Math.random() * types.length)],
      paymentMethod: payments[Math.floor(Math.random() * payments.length)],
      cashier: cashiers[Math.floor(Math.random() * cashiers.length)],
      timeline,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
    });
  }
  return orders.sort((a, b) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
}

// ============================================================
// CART STORE
// ============================================================

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
  addItem: (menuItem) => {
    set((state) => {
      const existing = state.items.find((i) => i.menuItem.id === menuItem.id);
      if (existing) {
        return { items: state.items.map((i) => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { items: [...state.items, { menuItem, quantity: 1 }] };
    });
  },
  removeItem: (menuItemId) => set((state) => ({ items: state.items.filter((i) => i.menuItem.id !== menuItemId) })),
  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      set((state) => ({ items: state.items.filter((i) => i.menuItem.id !== menuItemId) }));
    } else {
      set((state) => ({ items: state.items.map((i) => i.menuItem.id === menuItemId ? { ...i, quantity } : i) }));
    }
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0),
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));

// ============================================================
// APP STORE (persisted)
// ============================================================

interface AppStore {
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  settings: CafeSettings;
  theme: 'light' | 'dark';

  // Categories
  addCategory: (cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Menu Items
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  // Orders
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'timeline'>) => Order;
  updateOrderStatus: (id: string, status: OrderStatus, note?: string) => void;

  // Settings
  updateSettings: (settings: Partial<CafeSettings>) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      menuItems: defaultMenuItems,
      orders: generateOrderHistory(),
      settings: {
        name: 'کافه COOL',
        logo: '',
        phone: '۰۲۱-۱۲۳۴۵۶۷۸',
        email: 'info@coolcafe.ir',
        address: 'تهران، خیابان ولیعصر',
        theme: 'light',
      },
      theme: 'light',

      addCategory: (cat) => {
        const now = dayjs().toISOString();
        set((s) => ({ categories: [...s.categories, { ...cat, id: uuidv4(), createdAt: now, updatedAt: now }] }));
      },
      updateCategory: (id, cat) => {
        set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, ...cat, updatedAt: dayjs().toISOString() } : c) }));
      },
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addMenuItem: (item) => {
        const now = dayjs().toISOString();
        set((s) => ({ menuItems: [...s.menuItems, { ...item, id: uuidv4(), createdAt: now, updatedAt: now }] }));
      },
      updateMenuItem: (id, item) => {
        set((s) => ({ menuItems: s.menuItems.map((m) => m.id === id ? { ...m, ...item, updatedAt: dayjs().toISOString() } : m) }));
      },
      deleteMenuItem: (id) => set((s) => ({ menuItems: s.menuItems.filter((m) => m.id !== id) })),

      addOrder: (orderData) => {
        const now = dayjs().toISOString();
        const orderCount = get().orders.length;
        const order: Order = {
          ...orderData,
          id: uuidv4(),
          orderNumber: `COOL-${String(1000 + orderCount).padStart(4, '0')}`,
          timeline: [{ status: 'pending', timestamp: now }],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },
      updateOrderStatus: (id, status, note) => {
        const now = dayjs().toISOString();
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, status, updatedAt: now, timeline: [...o.timeline, { status, timestamp: now, note }] }
              : o
          ),
        }));
      },

      updateSettings: (settings) => set((s) => ({ settings: { ...s.settings, ...settings } })),
      toggleTheme: () => set((s) => {
        const newTheme = s.theme === 'light' ? 'dark' : 'light';
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { theme: newTheme };
      }),
    }),
    {
      name: 'cool-cafe-storage',
      partialize: (state) => ({
        categories: state.categories,
        menuItems: state.menuItems,
        orders: state.orders,
        settings: state.settings,
        theme: state.theme,
      }),
    }
  )
);

// ============================================================
// PRICE FORMATTER
// ============================================================
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}
