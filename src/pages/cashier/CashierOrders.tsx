import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle2, Bell, Search, DollarSign, ShoppingBag, TrendingUp, X, Package } from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ScrollRow from '@/components/ui/ScrollRow';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import OrderDetailModal, { statusConfig } from '@/components/admin/OrderDetailModal';
import { fromNowFa } from '@/utils/jalali';
import type { OrderStatus } from '@/types';

const activeStatusKeys = ['pending', 'preparing', 'ready'];

export default function CashierOrders() {
  const { orders: rawOrders, updateOrderStatus, loading } = useAppStore();
  const orders = rawOrders ?? [];
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) ?? null : null;
  const [confirmStatus, setConfirmStatus] = useState<{ id: string; status: OrderStatus } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const activeOrders = orders.filter(o => activeStatusKeys.includes(o.status));
  const statusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
  };

  const filteredOrders = useMemo(() => {
    let result = selectedStatus === 'all' ? activeOrders
      : selectedStatus === 'all_orders' ? orders
      : orders.filter(o => o.status === selectedStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerFirstName.toLowerCase().includes(q) ||
        o.customerLastName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    }
    return result;
  }, [orders, activeOrders, selectedStatus, searchQuery]);

  useEffect(() => { setPage(1); }, [selectedStatus, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const todayStats = useMemo(() => {
    const today = dayjs().startOf('day');
    const todayOrders = orders.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    return {
      count: todayOrders.length,
      revenue: todayOrders.reduce((s, o) => s + o.total, 0),
      avg: todayOrders.length > 0 ? todayOrders.reduce((s, o) => s + o.total, 0) / todayOrders.length : 0,
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

  const nextStatusMap: Record<string, OrderStatus> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };
  const nextStatusLabel: Record<string, string> = { pending: 'شروع آماده‌سازی', preparing: 'آماده شد', ready: 'تحویل داده شد' };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">سفارش‌ها</h1>
        <p className="text-sm text-zinc-500">{activeOrders.length} سفارش فعال</p>
      </div>

      {/* آمار امروز */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: DollarSign, color: 'text-emerald-500', value: formatPrice(todayStats.revenue), label: 'فروش امروز' },
          { icon: ShoppingBag, color: 'text-blue-500', value: todayStats.count, label: 'سفارش امروز' },
          { icon: TrendingUp, color: 'text-purple-500', value: formatPrice(todayStats.avg), label: 'میانگین' },
        ].map(({ icon: Icon, color, value, label }) => (
          <div key={label} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center">
            <Icon className={cn('w-5 h-5 mx-auto mb-1', color)} />
            <p className="text-base font-black text-zinc-900 dark:text-zinc-100">{value}</p>
            <p className="text-[10px] text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {/* فیلتر وضعیت */}
      <ScrollRow trackClassName="gap-2">
        {[
          { key: 'all', label: 'همه فعال', count: activeOrders.length },
          { key: 'pending', label: 'در انتظار', count: statusCounts.pending },
          { key: 'preparing', label: 'آماده‌سازی', count: statusCounts.preparing },
          { key: 'ready', label: 'آماده', count: statusCounts.ready },
          { key: 'delivered', label: 'تحویل شده', count: orders.filter(o => o.status === 'delivered').length },
          { key: 'cancelled', label: 'لغو شده', count: orders.filter(o => o.status === 'cancelled').length },
          { key: 'all_orders', label: 'همه سفارش‌ها', count: orders.length },
        ].map(s => (
          <button key={s.key} onClick={() => setSelectedStatus(s.key)}
            className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border',
              selectedStatus === s.key ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700')}>
            {s.label} {s.count > 0 && <span className={cn('mr-1 px-1.5 py-0.5 rounded-full text-xs', selectedStatus === s.key ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-700')}>{s.count}</span>}
          </button>
        ))}
      </ScrollRow>

      {/* جستجو */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="جستجو با شماره، نام یا تلفن..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        )}
      </div>

      {/* لیست سفارشات */}
      <div className="space-y-3">
        {loading && orders.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 animate-pulse">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          ))
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {paginatedOrders.map((order, i) => {
                const config = statusConfig[order.status];
                const isUrgent = dayjs().diff(dayjs(order.createdAt), 'minute') > 15 && order.status === 'pending';
                const next = nextStatusMap[order.status] as OrderStatus | undefined;
                return (
                  <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={cn('bg-white dark:bg-zinc-800 rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-lg',
                      isUrgent ? 'border-red-300 dark:border-red-800' : 'border-zinc-200 dark:border-zinc-700')}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full" dir="ltr">
                          #{order.orderNumber.replace('COOL-', '')}
                        </span>
                        {isUrgent && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse"><Bell className="w-3 h-3 inline" /> فوری</span>}
                        {order.isTakeaway && <Badge variant="warning"><Package className="w-3 h-3 inline ml-0.5" />بیرون‌بر</Badge>}
                      </div>
                      <Badge variant={config.variant} dot>{config.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{order.customerFirstName} {order.customerLastName}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{order.items?.length} آیتم · {fromNowFa(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-brand-600">{formatPrice(order.total)}</span>
                        {next && (
                          <Button size="sm" onClick={e => { e.stopPropagation(); handleStatusChange(order.id, next); }} className="!rounded-lg !py-1.5">
                            {nextStatusLabel[order.status]}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredOrders.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="font-bold text-zinc-500">سفارشی نیست</p>
                <p className="text-sm text-zinc-400 mt-1">{searchQuery ? 'جستجو نتیجه‌ای نداشت' : 'همه پردازش شده‌اند'}</p>
              </div>
            )}

            {filteredOrders.length > 0 && (
              <Pagination page={page} pageSize={pageSize} total={filteredOrders.length}
                onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700" />
            )}
          </>
        )}
      </div>

      {/* مودال جزئیات */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrderId(null)}
        title={`سفارش ${selectedOrder?.orderNumber ?? ''}`} fixedHeight>
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onStatusChange={status => handleStatusChange(selectedOrder.id, status)}
          />
        )}
      </Modal>
    </div>
  );
}
