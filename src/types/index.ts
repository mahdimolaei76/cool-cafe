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
  /** Display order within this item's category (sort_order from the DB). */
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'in-person' | 'online';
export type PaymentMethod = 'cash' | 'card' | 'online' | 'credit' | 'other';

export interface OrderPaymentEvent {
  id: string;
  orderId: string;
  kind: 'price_override' | 'payment_method' | 'paid' | 'service_charge';
  oldValue: string;
  newValue: string;
  note?: string;
  cashier?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem?: MenuItem;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  serviceCharge: number;
  isPriceVariable?: boolean;
  priceConfirmed?: boolean;
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
  subtotal: number;
  discount: number;
  serviceCharge: number;
  priceOverride?: number;
  total: number;
  notes: string;
  status: OrderStatus;
  orderType: OrderType;
  isTakeaway: boolean;
  paymentMethod: PaymentMethod;
  paidByCredit?: boolean;
  isPaid?: boolean;
  cashier: string;
  timeline: OrderTimeline[];
  paymentEvents?: OrderPaymentEvent[];
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  _unsynced?: boolean;
}

// A café customer, managed from "مدیریت مشتری‌ها" in the admin panel.
// Matched to orders by phone number. creditBalance can be positive
// (customer has pre-paid credit) or negative (customer owes money /
// بدهی) — it can only be toggled while the balance is exactly 0.
export interface Customer {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  creditEnabled: boolean;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithHistory extends Customer {
  orders: Order[];
}

/** One row of a customer's combined order + credit-account timeline
 * (تاریخچه سفارشات modal) — either a finalized order or a manual/automatic
 * credit-account change not tied to any specific order. */
export interface CustomerHistoryEntry {
  entryType: 'order' | 'credit';
  id: string;
  orderNumber?: string;
  orderStatus?: OrderStatus | '';
  paymentMethod?: PaymentMethod | '';
  creditKind?: 'increase' | 'purchase' | 'settle' | 'order_charge' | '';
  amount: number;
  createdAt: string;
  deliveredAt?: string;
}

export interface CustomerHistoryResult {
  customer: Customer;
  entries: CustomerHistoryEntry[];
  total: number;
}

export interface CustomerListResult {
  customers: Customer[];
  total: number;
}

/** Kinds accepted by the "تغییر مقدار بدهی" credit-adjustment modal. */
export type CreditAdjustKind = 'increase' | 'purchase' | 'settle';

/** Alias kept for readability where "order/credit timeline row" is meant. */
export type HistoryEntry = CustomerHistoryEntry;

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
  workingHours: string;
  aboutText: string;
  takeawayFeeEnabled: boolean;
  takeawayFee: number;
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
