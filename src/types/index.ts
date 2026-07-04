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
  price: number;
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
  price: number;
  quantity: number;
  subtotal: number;
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
  total: number;
  notes: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  cashier: string;
  timeline: OrderTimeline[];
  createdAt: string;
  updatedAt: string;
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
