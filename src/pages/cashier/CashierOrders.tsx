import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, Bell, Search, DollarSign, ShoppingBag, TrendingUp, X, Clock, ChefHat, Truck, XCircle, MoreVertical } from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { useOrderPolling } from '@/hooks/useOrderPolling';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Banner from '@/components/ui/Banner';
import ScrollRow from '@/components/ui/ScrollRow';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import type { OrderStatus } from '@/types';
import { fromNowFa, formatJalaliDateTime } from '@/utils/jalali';
import OrderPaymentPanel from '@/components/admin/OrderPaymentPanel';

const statusMap: Record<string, { label: string; color: string; bgColor: string; textColor: string; badgeVariant: 'warning' | 'info' | 'success'; next?: OrderStatus; nextLabel?: string; }> = {
  pending: { label: 'در انتظار', color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', badgeVariant: 'warning', next: 'preparing', nextLabel: 'شروع آماده‌سازی' },
  preparing: { label: 'در حال آماده‌سازی', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-400', badgeVariant: 'info', next: 'ready', nextLabel: 'آماده شد' },
  ready: { label: 'آماده تحویل', color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', badgeVariant: 'success', next: 'delivered', nextLabel: 'تحویل داده شد' },
};

// All statuses the "jump to any status" three-dot menu can offer, in the
// same icon/color style used by the admin order-management screen.
const allStatusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'در انتظار', icon: Clock, color: 'text-amber-600' },
  preparing: { label: 'در حال آماده‌سازی', icon: ChefHat, color: 'text-blue-600' },
  ready: { label: 'آماده تحویل', icon: CheckCircle2, color: 'text-emerald-600' },
  delivered: { label: 'تحویل شده', icon: Truck, color: 'text-zinc-600' },
  cancelled: { label: 'لغو شده', icon: XCircle, color: 'text-red-600' },
};
const allStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

export default function CashierOrders() {
  const { orders: rawOrders, updateOrderStatus, updateOrderItemPrice, loading } = useAppStore();
  useOrderPolling();
  const orders = rawOrders ?? [];
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // Derived (not a snapshot) so that after e.g. confirming an item's price,
  // the modal reflects the updated totals/receipt immediately instead of
  // showing whatever was true at the moment the modal was opened.
  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) ?? null : null;
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Close the "jump to any status" menu on outside click.
  useEffect(() => {
    if (!statusMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [statusMenuOpen]);

  const confirmItemPrice = async (itemId: string) => {
    const raw = priceDrafts[itemId];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price < 0) {
      toast.error('قیمت معتبر وارد کنید');
      return;
    }
    setSavingItemId(itemId);
    try {
      await updateOrderItemPrice(selectedOrderId!, itemId, price);
      toast.success('قیمت ثبت شد و فیش به‌روزرسانی شد');
    } finally {
      setSavingItemId(null);
    }
  };

  const activeOrders = orders?.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const statusCounts: Record<string, number> = {
    pending: orders?.filter(o => o.status === 'pending')?.length || 0,
    preparing: orders?.filter(o => o.status === 'preparing')?.length || 0,
    ready: orders?.filter(o => o.status === 'ready')?.length || 0,
  };

  const filteredOrders = useMemo(() => {
    let result = selectedStatus === 'all'
      ? activeOrders
      : selectedStatus === 'all_orders'
        ? orders
        : orders?.filter(o => o.status === selectedStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result?.filter(o => o.orderNumber.toLowerCase().includes(q) || o.customerFirstName.toLowerCase().includes(q) || o.customerLastName.toLowerCase().includes(q) || o.customerPhone.includes(q));
    }
    return result;
  }, [orders, activeOrders, selectedStatus, searchQuery]);

  // برگشت به صفحه اول با تغییر فیلتر یا جستجو تا کاربر روی صفحه‌ی خالی نماند
  useEffect(() => { setPage(1); }, [selectedStatus, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders?.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  // Daily stats
  const todayStats = useMemo(() => {
    const today = dayjs().startOf('day');
    const todayOrders = orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    return {
      count: todayOrders?.length,
      revenue: todayOrders.reduce((s, o) => s + o.total, 0),
      avg: todayOrders?.length > 0 ? todayOrders.reduce((s, o) => s + o.total, 0) / todayOrders?.length : 0,
    };
  }, [orders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setSelectedOrderId(null);
      toast.success('وضعیت سفارش بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت با خطا مواجه شد');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">سفارش‌ها</h1>
          <p className="text-sm text-zinc-500">{activeOrders?.length} سفارش فعال</p>
        </div>
      </div>

      {/* Today Stats — mini */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
          <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{formatPrice(todayStats.revenue)}</p>
          <p className="text-[10px] text-zinc-400">فروش امروز</p>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
          <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{todayStats.count}</p>
          <p className="text-[10px] text-zinc-400">سفارش امروز</p>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
          <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{formatPrice(todayStats.avg)}</p>
          <p className="text-[10px] text-zinc-400">میانگین</p>
        </div>
      </div>

      {/* Status Filter */}
      <ScrollRow trackClassName="gap-2">
        {[
          { key: 'all', label: 'همه فعال', count: activeOrders?.length },
          { key: 'pending', label: 'در انتظار', count: statusCounts.pending },
          { key: 'preparing', label: 'آماده‌سازی', count: statusCounts.preparing },
          { key: 'ready', label: 'آماده', count: statusCounts.ready },
          { key: 'delivered', label: 'تحویل شده', count: orders?.filter(o => o.status === 'delivered')?.length || 0 },
          { key: 'cancelled', label: 'لغو شده', count: orders?.filter(o => o.status === 'cancelled')?.length || 0 },
          { key: 'all_orders', label: 'همه سفارش‌ها', count: orders?.length || 0 },
        ]?.map(s => (
          <button key={s.key} onClick={() => setSelectedStatus(s.key)} className={cn(
            'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border',
            selectedStatus === s.key ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
          )}>
            {s.label} {s.count > 0 && <span className={cn('mr-1 px-1.5 py-0.5 rounded-full text-xs', selectedStatus === s.key ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-700')}>{s.count}</span>}
          </button>
        ))}
      </ScrollRow>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="جستجو با شماره، نام یا تلفن..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-zinc-400" /></button>}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading && rawOrders?.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {paginatedOrders?.map((order, i) => {
                const config = statusMap[order.status];
                const isUrgent = dayjs().diff(dayjs(order.createdAt), 'minute') > 15 && order.status === 'pending';
                return (
                  <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedOrderId(order.id)}
                    className={cn('bg-white dark:bg-zinc-800 rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-lg', isUrgent ? 'border-red-300 dark:border-red-800' : 'border-zinc-200 dark:border-zinc-700')}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full" dir="ltr">#{order.orderNumber.replace('COOL-', '')}</span>
                        {isUrgent && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse"><Bell className="w-3 h-3 inline" /> فوری</span>}
                      </div>
                      {config && <Badge variant={config.badgeVariant} dot>{config.label}</Badge>}
                      {!config && <Badge variant={order.status === 'delivered' ? 'success' : 'danger'}>{order.status === 'delivered' ? 'تحویل شده' : 'لغو شده'}</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{order.customerFirstName} {order.customerLastName}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{order.items?.length} آیتم · {fromNowFa(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-brand-600">{formatPrice(order.total)}</span>
                        {config?.next && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, config.next!); }} className="!rounded-lg !py-1.5">
                            {config.nextLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filteredOrders?.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="font-bold text-zinc-500">سفارشی نیست</p>
                <p className="text-sm text-zinc-400 mt-1">{searchQuery ? 'جستجو نتیجه‌ای نداشت' : 'همه پردازش شده‌اند'}</p>
              </div>
            )}
            {filteredOrders?.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filteredOrders.length}
                onPageChange={setPage}
                onPageSizeChange={size => { setPageSize(size); setPage(1); }}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700"
              />
            )}
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrderId(null)} title={`سفارش ${selectedOrder?.orderNumber}`}
        footer={selectedOrder && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedOrderId(null)}>بستن</Button>
            {statusMap[selectedOrder.status]?.next && (
              <Button className="flex-1" onClick={() => handleStatusChange(selectedOrder.id, statusMap[selectedOrder.status].next!)}>
                {statusMap[selectedOrder.status].nextLabel}
              </Button>
            )}
            {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
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
                      {allStatuses.filter(s => s !== selectedOrder.status).map(s => {
                        const sc = allStatusConfig[s];
                        return (
                          <button
                            key={s}
                            onClick={() => { handleStatusChange(selectedOrder.id, s); setStatusMenuOpen(false); }}
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
        )}>
        {selectedOrder && (
          <div className="p-5 space-y-4">
            <div className={cn('p-3 rounded-xl', statusMap[selectedOrder.status]?.bgColor || 'bg-zinc-100')}>
              <p className={cn('font-bold', statusMap[selectedOrder.status]?.textColor || 'text-zinc-600')}>{statusMap[selectedOrder.status]?.label || selectedOrder.status}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{formatJalaliDateTime(selectedOrder.createdAt)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-400">مشتری</p>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-400">نوع</p>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{selectedOrder.orderType === 'online' ? 'آنلاین' : 'حضوری'} · {selectedOrder.paymentMethod === 'cash' ? 'نقدی' : 'کارت'}</p>
              </div>
            </div>
            <OrderPaymentPanel order={selectedOrder} />
            <div className="space-y-2">
              {selectedOrder.items?.map(item => {
                const needsPricing = item.isPriceVariable && !item.priceConfirmed;
                return (
                  <div key={item.id} className={cn(
                    'flex items-center justify-between p-3 rounded-xl gap-3',
                    needsPricing ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : 'bg-zinc-50 dark:bg-zinc-800'
                  )}>
                    <span className="text-sm min-w-0 truncate">
                      <span className="font-bold">{item.quantity}×</span> {item.name}
                      {needsPricing && (
                        <span className="block text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">{item.priceLabel || 'نیاز به قیمت‌گذاری'}</span>
                      )}
                    </span>
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
                      <span className="font-bold text-sm flex-shrink-0">{formatPrice(item.subtotal)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedOrder.items?.some(i => i.isPriceVariable && !i.priceConfirmed) && (
              <Banner variant="warning">
                مبلغ زیر شامل قیمت اقلامِ قیمت‌گذاری‌نشده نیست — پس از ثبت قیمت آن‌ها، مبلغ نهایی به‌روزرسانی می‌شود.
              </Banner>
            )}
            <div className="pt-3 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700 flex justify-between">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">مبلغ نهایی</span>
              <span className="text-2xl font-black text-brand-600">{formatPrice(selectedOrder.total)}</span>
            </div>
            {selectedOrder.notes && (
              <Banner variant="warning">{selectedOrder.notes}</Banner>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
