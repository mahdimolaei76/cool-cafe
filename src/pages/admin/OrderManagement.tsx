import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Clock, CheckCircle2, XCircle, Truck, ChefHat, RefreshCw, Phone, Receipt, User, MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { fromNowFa, formatJalaliDateTime, formatJalali } from '@/utils/jalali';

import Badge from '@/components/ui/Badge';
import Banner from '@/components/ui/Banner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import Separator from '@/components/ui/Separator';
import OrderPaymentPanel from '@/components/admin/OrderPaymentPanel';
import type { Order, OrderStatus } from '@/types';


const statusConfig: Record<OrderStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'default' | 'danger'; icon: typeof Clock; color: string; bgColor: string; }> = {
  pending: { label: 'در انتظار', variant: 'warning', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  preparing: { label: 'در حال آماده‌سازی', variant: 'info', icon: ChefHat, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  ready: { label: 'آماده تحویل', variant: 'success', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  delivered: { label: 'تحویل شده', variant: 'default', icon: Truck, color: 'text-zinc-600', bgColor: 'bg-zinc-100 dark:bg-zinc-800' },
  cancelled: { label: 'لغو شده', variant: 'danger', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30' },
};

const typeLabels: Record<string, string> = { 'in-person': 'حضوری', 'online': 'آنلاین' };
const paymentLabels: Record<string, string> = { 'cash': 'نقدی', 'card': 'کارت', 'online': 'اینترنتی', 'credit': 'اعتباری', 'other': 'سایر' };

export default function OrderManagement() {
  const { orders: rawOrders, updateOrderStatus, loading } = useAppStore();
  const orders = rawOrders ?? [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // همیشه سفارشِ آپدیت‌شده را از استور می‌خوانیم تا مدال بعد از هر عملیات
  // (تغییر وضعیت، ثبت قیمت آیتم و ...) بدون نیاز به همگام‌سازی دستی به‌روز بماند.
  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders?.find(o => o.id === selectedOrderId) ?? null : null),
    [orders, selectedOrderId]
  );
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; status: OrderStatus; } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result?.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerFirstName.toLowerCase().includes(q) ||
        o.customerLastName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    }
    if (statusFilter) {
      result = result?.filter(o => o.status === statusFilter);
    }
    return result;
  }, [orders, search, statusFilter]);

  // Reset to the first page whenever the filter/search changes the result
  // set — otherwise the person could land on a now-empty page.
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    try {
      await updateOrderStatus(confirmAction.orderId, confirmAction.status);
      toast.success('وضعیت سفارش بروزرسانی شد');
      setConfirmAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت با خطا مواجه شد');
    }
  };

  const nextStatus: Record<string, OrderStatus> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  // Active orders (pending, preparing, ready)
  const activeOrders = filtered?.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">مدیریت سفارش‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {statusCounts['pending'] || 0} در انتظار • {statusCounts['preparing'] || 0} در حال آماده‌سازی • {statusCounts['ready'] || 0} آماده
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} icon={<RefreshCw className="w-4 h-4" />}>
          بروزرسانی
        </Button>
      </div>

      <Separator />

      {/* Status Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const)?.map(status => {
          const config = status ? statusConfig[status] : null;
          const count = status ? (statusCounts[status] || 0) : orders?.length;
          const isActive = statusFilter === status;
          const activeBorder: Record<string, string> = {
            pending: 'border-amber-500',
            preparing: 'border-blue-500',
            ready: 'border-emerald-500',
            delivered: 'border-zinc-500',
            cancelled: 'border-red-500',
          };
          const activeText: Record<string, string> = {
            pending: 'text-amber-800 dark:text-amber-400',
            preparing: 'text-blue-800 dark:text-blue-400',
            ready: 'text-emerald-800 dark:text-emerald-400',
            delivered: 'text-zinc-800 dark:text-zinc-300',
            cancelled: 'text-red-800 dark:text-red-400',
          };

          return (
            <button
              key={status || 'all'}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'p-4 rounded-2xl border-2 transition-all text-right',
                isActive
                  ? cn(activeBorder[status || 'delivered'] || 'border-brand-500', config?.bgColor || 'bg-brand-50 dark:bg-brand-900/30', 'shadow-md')
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                {config ? (
                  <config.icon className={cn('w-5 h-5', isActive ? activeText[status] : config.color)} />
                ) : (
                  <Receipt className={cn('w-5 h-5', isActive ? 'text-brand-600' : 'text-zinc-400')} />
                )}
                <span className={cn('text-2xl font-bold', isActive ? (activeText[status || 'delivered'] || 'text-brand-800') : 'text-zinc-900 dark:text-zinc-100')}>
                  {count}
                </span>
              </div>
              <p className={cn('text-sm font-bold', isActive ? (activeText[status || 'delivered'] || 'text-brand-700') : 'text-zinc-600 dark:text-zinc-400')}>
                {config?.label || 'همه سفارش‌ها'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Separator />
      <Input
        type="text"
        placeholder="جستجو با شماره سفارش، نام یا تلفن..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search className="w-5 h-5" />}
      />

      {/* Active Orders Grid */}
      {activeOrders?.length > 0 && !statusFilter && (
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">سفارش‌های فعال</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {activeOrders.slice(0, 6)?.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  onView={() => setSelectedOrderId(order.id)}
                  onStatusChange={(status) => setConfirmAction({ orderId: order.id, status })}
                  nextStatus={nextStatus[order.status]}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* All Orders Table */}
      <Separator />
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {statusFilter ? statusConfig[statusFilter].label : 'همه سفارش‌ها'} ({filtered?.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">شماره</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">مشتری</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">وضعیت</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 hidden md:table-cell">نوع</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">مبلغ</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500 hidden lg:table-cell">زمان</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading && rawOrders?.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td colSpan={7} className="py-3 px-4">
                      <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length > 0 ? paginated.map(order => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-black text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-700 px-2.5 py-1 rounded-full" dir="ltr">
                      #{order.orderNumber.replace('COOL-', '')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
                      <p className="text-xs text-zinc-400" dir="ltr">{order.customerPhone}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={statusConfig[order.status].variant} dot>
                      {statusConfig[order.status].label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <Badge variant={order.orderType === 'online' ? 'info' : 'default'}>
                      {typeLabels[order.orderType]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(order.total)}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-zinc-400 text-xs">
                    {fromNowFa(order.createdAt)}
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    {nextStatus[order.status] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmAction({ orderId: order.id, status: nextStatus[order.status] })}
                      >
                        {statusConfig[nextStatus[order.status]].label}
                      </Button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                    {search || statusFilter ? 'سفارشی با این فیلتر یافت نشد' : 'هنوز سفارشی ثبت نشده است'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1); }}
          className="border-t border-zinc-100 dark:border-zinc-800"
        />
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrderId(null)} title={`سفارش ${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && <OrderDetail order={selectedOrder} onStatusChange={(status) => setConfirmAction({ orderId: selectedOrder.id, status })} nextStatus={nextStatus[selectedOrder.status]} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleStatusChange}
        title="تغییر وضعیت سفارش"
        message={confirmAction ? `وضعیت سفارش به "${statusConfig[confirmAction.status].label}" تغییر کند؟` : ''}
        confirmText="تأیید"
        variant={confirmAction?.status === 'cancelled' ? 'danger' : 'primary'}
      />
    </div>
  );
}

// Order Card Component
function OrderCard({ order, index, onView, onStatusChange, nextStatus }: {
  order: Order;
  index: number;
  onView: () => void;
  onStatusChange: (status: OrderStatus) => void;
  nextStatus?: OrderStatus;
}) {
  const config = statusConfig[order.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onClick={onView}
      className={cn(
        'p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg',
        config.bgColor,
        'border-transparent hover:border-brand-300 dark:hover:border-brand-700'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 px-2 py-1 rounded" dir="ltr">
            {order.orderNumber}
          </span>
          <p className="text-xs text-zinc-400 mt-2">{fromNowFa(order.createdAt)}</p>
        </div>
        <Badge variant={config.variant} dot>{config.label}</Badge>
      </div>

      <div className="mb-3">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
        <p className="text-xs text-zinc-400">{order.items?.length} آیتم</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(order.total)}</span>
        {nextStatus && (
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onStatusChange(nextStatus); }}
          >
            {statusConfig[nextStatus].label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Order Detail Component
function OrderDetail({ order, onStatusChange, nextStatus }: {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
  nextStatus?: OrderStatus;
}) {
  const config = statusConfig[order.status];
  const updateOrderItemPrice = useAppStore(s => s.updateOrderItemPrice);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close the "jump to any status" menu on outside click.
  useEffect(() => {
    if (!statusMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [statusMenuOpen]);

  const allStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

  const confirmItemPrice = async (itemId: string) => {
    const raw = priceDrafts[itemId];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price < 0) {
      toast.error('قیمت معتبر وارد کنید');
      return;
    }
    setSavingItemId(itemId);
    try {
      await updateOrderItemPrice(order.id, itemId, price);
      toast.success('قیمت ثبت شد');
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Status Badge */}
      <div className={cn('p-4 rounded-2xl flex items-center gap-3', config.bgColor)}>
        <config.icon className={cn('w-6 h-6', config.color)} />
        <div>
          <p className={cn('font-bold', config.color)}>{config.label}</p>
          <p className="text-xs text-zinc-500">{formatJalaliDateTime(order.createdAt)}</p>
        </div>
      </div>

      {/* Payment controls (پرداخت شد / پرداخت اعتباری / روش پرداخت) */}
      <OrderPaymentPanel order={order} />

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-zinc-400" />
            <p className="text-xs text-zinc-400">مشتری</p>
          </div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
        </div>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-zinc-400" />
            <p className="text-xs text-zinc-400">تلفن</p>
          </div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100 font-mono" dir="ltr">{order.customerPhone || '—'}</p>
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <p className="text-xs text-zinc-400">نوع</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">{typeLabels[order.orderType]}</p>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <p className="text-xs text-zinc-400">پرداخت</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">{paymentLabels[order.paymentMethod]}</p>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
          <p className="text-xs text-zinc-400">صندوق‌دار</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-1">{order.cashier || '—'}</p>
        </div>
      </div>

      {/* Items */}
      <div>
        <p className="text-sm font-medium text-zinc-500 mb-3">آیتم‌ها ({order.items?.length})</p>
        <div className="space-y-2">
          {order.items?.map(item => {
            const needsPricing = item.isPriceVariable && !item.priceConfirmed;
            return (
              <div key={item.id} className={cn(
                'flex items-center justify-between p-3 rounded-xl gap-3',
                needsPricing ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : 'bg-zinc-50 dark:bg-zinc-800/50'
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center text-sm font-bold text-brand-700 dark:text-brand-400 flex-shrink-0">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                    {needsPricing ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{item.priceLabel || 'نیاز به قیمت‌گذاری'}</p>
                    ) : (
                      <p className="text-xs text-zinc-400">{formatPrice(item.price)}</p>
                    )}
                  </div>
                </div>
                {needsPricing ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="قیمت واحد"
                      value={priceDrafts[item.id] ?? ''}
                      onChange={e => setPriceDrafts(p => ({ ...p, [item.id]: e.target.value }))}
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <Button size="sm" onClick={() => confirmItemPrice(item.id)} loading={savingItemId === item.id} className="!rounded-lg !py-1.5">
                      ثبت
                    </Button>
                  </div>
                ) : (
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 flex-shrink-0">{formatPrice(item.subtotal)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2">
        {order.items?.some(i => i.isPriceVariable && !i.priceConfirmed) && (
          <Banner variant="warning">
            مبلغ زیر شامل قیمت اقلامِ قیمت‌گذاری‌نشده نیست — پس از ثبت قیمت آن‌ها، مبلغ نهایی به‌روزرسانی می‌شود.
          </Banner>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">جمع</span>
          <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">تخفیف</span>
            <span className="text-emerald-600">-{formatPrice(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <span className="text-zinc-900 dark:text-zinc-100">مبلغ نهایی</span>
          <span className="text-brand-800 dark:text-brand-400">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <Banner variant="warning" title="یادداشت">{order.notes}</Banner>
      )}

      {/* Timeline */}
      <div>
        <p className="text-sm font-medium text-zinc-500 mb-3">تاریخچه</p>
        <div className="space-y-3">
          {order.timeline?.map((event, i) => {
            const eventConfig = statusConfig[event.status];
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={cn('w-3 h-3 rounded-full mt-1 flex-shrink-0', eventConfig.bgColor, 'ring-4 ring-white dark:ring-zinc-900')} style={{ backgroundColor: eventConfig.color.replace('text-', '') }} />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{eventConfig.label}</p>
                  <p className="text-xs text-zinc-400">{formatJalali(event.timestamp, 'HH:mm:ss - YYYY/MM/DD')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        {nextStatus && (
          <Button className="flex-1" onClick={() => onStatusChange(nextStatus)}>
            تغییر به {statusConfig[nextStatus].label}
          </Button>
        )}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <Button variant="danger" onClick={() => onStatusChange('cancelled')}>
            لغو سفارش
          </Button>
        )}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="relative" ref={statusMenuRef}>
            <Button variant="outline" onClick={() => setStatusMenuOpen(o => !o)} aria-label="تغییر به وضعیت دیگر" className="!px-3">
              <MoreVertical className="w-4 h-4" />
            </Button>
            <AnimatePresence>
              {statusMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 left-0 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-700 py-1.5 z-10"
                >
                  <p className="px-3 py-1.5 text-xs text-zinc-400 font-medium">تغییر مستقیم وضعیت به:</p>
                  {allStatuses.filter(s => s !== order.status).map(s => {
                    const sc = statusConfig[s];
                    return (
                      <button
                        key={s}
                        onClick={() => { onStatusChange(s); setStatusMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                      >
                        <sc.icon className={cn('w-4 h-4', sc.color)} />
                        <span className="text-zinc-700 dark:text-zinc-200">{sc.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
