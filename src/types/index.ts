export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** For priceType 'fixed' this is the real price. For 'variable' it's
   * ignored for order totals (kept as 0 or a reference/starting price)
   * — the actual amount is entered by the cashier per order instead. */
  price: number;
  /** 'variable' items (e.g. "قیمت بازار" / "توافقی") don't have one fixed
   * number — customers/cashiers can still add them to an order, but the
   * amount is set later by the cashier and is tracked outside the normal
   * numeric subtotal until then. */
  priceType: 'fixed' | 'variable';
  /** Free-text shown instead of a price for variable items, e.g. "قیمت بازار". */
  priceLabel?: string;
  categoryId: string;
  category?: Category;
  image: string;
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'in-person' | 'online';
export type PaymentMethod = 'cash' | 'card' | 'other';

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem?: MenuItem;
  name: string;
  /** For variable-priced items this is 0 (or a placeholder) until the
   * cashier confirms the real price — see `priceConfirmed`. */
  price: number;
  quantity: number;
  subtotal: number;
  /** True if this line's price still needs to be set by the cashier
   * (copied from the menu item's priceType at the time it was ordered,
   * since prices/labels can change later but the order shouldn't). */
  isPriceVariable?: boolean;
  /** For variable-priced items: false until a cashier enters the actual
   * price during order processing/confirmation. Fixed-price items are
   * always considered confirmed. */
  priceConfirmed?: boolean;
  /** Free-text label shown in place of a price while unconfirmed, e.g. "قیمت بازار". */
  priceLabel?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  items: OrderItem[];
  /** Sum of confirmed/fixed-price items only. Items with an unconfirmed
   * variable price (see OrderItem.priceConfirmed) are excluded — they're
   * tracked separately, like a pending line the cashier still needs to
   * price, rather than silently counted as free or blocking the rest of
   * the order from being totaled. */
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  cashier: string;
  timeline: OrderTimeline[];
  createdAt: string;
  updatedAt: string;
  /** True only for orders created locally when the backend could not be
   * reached — they exist on this device only and were NOT saved to the
   * server, so kitchen/reports/other devices won't see them yet. */
  _unsynced?: boolean;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  revenueChange: number;
  ordersChange: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface ProductPerformance {
  name: string;
  sold: number;
  revenue: number;
}

export interface CafeSettings {
  name: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  theme: 'light' | 'dark' | 'system';
  /** e.g. "۷ صبح تا ۱۰ شب" — shown wherever working hours used to be hardcoded. */
  workingHours: string;
  /** Free-text shown on the public "درباره ما" page. */
  aboutText: string;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  category?: string;
  product?: string;
  status?: OrderStatus;
  cashier?: string;
  orderType?: OrderType;
}
