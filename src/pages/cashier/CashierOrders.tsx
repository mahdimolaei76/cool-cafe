import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Bell, Search, DollarSign, ShoppingBag, TrendingUp, X } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fa';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import type { Order, OrderStatus } from '@/types';

dayjs.extend(relativeTime);
dayjs.locale('fa');

const statusMap: Record<string, { label: string; color: string; bgColor: string; textColor: string; next?: OrderStatus; nextLabel?: string; }> = {
  pending: { label: 'در انتظار', color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-400', next: 'preparing', nextLabel: 'شروع آماده‌سازی' },
  preparing: { label: 'در حال آماده‌سازی', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-400', next: 'ready', nextLabel: 'آماده شد' },
  ready: { label: 'آماده تحویل', color: 'bg-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-400', next: 'delivered', nextLabel: 'تحویل داده شد' },
};

export default function CashierOrders() {
  const { orders, updateOrderStatus } = useAppStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const activeOrders = orders?.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const statusCounts: Record<string, number> = {
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    ready: orders?.filter(o => o.status === 'ready').length || 0,
  };

  const filteredOrders = useMemo(() => {
    let result = selectedStatus === 'all' ? activeOrders : orders?.filter(o => o.status === selectedStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result?.filter(o => o.orderNumber.toLowerCase().includes(q) || o.customerFirstName.toLowerCase().includes(q) || o.customerLastName.toLowerCase().includes(q) || o.customerPhone.includes(q));
    }
    return result;
  }, [orders, activeOrders, selectedStatus, searchQuery]);

  // Daily stats
  const todayStats = useMemo(() => {
    const today = dayjs().startOf('day');
    const todayOrders = orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    return {
      count: todayOrders.length,
      revenue: todayOrders.reduce((s, o) => s + o.total, 0),
      avg: todayOrders.length > 0 ? todayOrders.reduce((s, o) => s + o.total, 0) / todayOrders.length : 0,
    };
  }, [orders]);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-surface-100">سفارش‌ها</h1>
          <p className="text-sm text-surface-500">{activeOrders.length} سفارش فعال</p>
        </div>
      </div>

      {/* Today Stats — mini */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-center">
          <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-black text-surface-900 dark:text-surface-100">{formatPrice(todayStats.revenue)}</p>
          <p className="text-[10px] text-surface-400">فروش امروز</p>
        </div>
        <div className="p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-center">
          <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-black text-surface-900 dark:text-surface-100">{todayStats.count}</p>
          <p className="text-[10px] text-surface-400">سفارش امروز</p>
        </div>
        <div className="p-3 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-center">
          <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-black text-surface-900 dark:text-surface-100">{formatPrice(todayStats.avg)}</p>
          <p className="text-[10px] text-surface-400">میانگین</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'all', label: 'همه فعال', count: activeOrders.length },
          { key: 'pending', label: 'در انتظار', count: statusCounts.pending },
          { key: 'preparing', label: 'آماده‌سازی', count: statusCounts.preparing },
          { key: 'ready', label: 'آماده', count: statusCounts.ready },
          { key: 'delivered', label: 'تحویل شده', count: orders?.filter(o => o.status === 'delivered').length || 0 },
        ].map(s => (
          <button key={s.key} onClick={() => setSelectedStatus(s.key)} className={cn(
            'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
            selectedStatus === s.key ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700'
          )}>
            {s.label} {s.count > 0 && <span className={cn('mr-1 px-1.5 py-0.5 rounded-full text-xs', selectedStatus === s.key ? 'bg-white/20' : 'bg-surface-100 dark:bg-surface-700')}>{s.count}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" placeholder="جستجو با شماره، نام یا تلفن..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-surface-400" /></button>}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, i) => {
            const config = statusMap[order.status];
            const isUrgent = dayjs().diff(dayjs(order.createdAt), 'minute') > 15 && order.status === 'pending';
            return (
              <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} onClick={() => setSelectedOrder(order)}
                className={cn('bg-white dark:bg-surface-800 rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-lg', isUrgent ? 'border-red-300 dark:border-red-800' : 'border-surface-200 dark:border-surface-700')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-surface-900 dark:text-surface-100" dir="ltr">#{order.orderNumber.replace('COOL-', '')}</span>
                    {isUrgent && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse"><Bell className="w-3 h-3 inline" /> فوری</span>}
                  </div>
                  {config && <span className={cn('px-2 py-1 rounded-lg text-xs font-bold', config.bgColor, config.textColor)}>{config.label}</span>}
                  {!config && <Badge variant={order.status === 'delivered' ? 'success' : 'danger'}>{order.status === 'delivered' ? 'تحویل شده' : 'لغو شده'}</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-surface-900 dark:text-surface-100 text-sm">{order.customerFirstName} {order.customerLastName}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{order.items.length} آیتم · {dayjs(order.createdAt).fromNow()}</p>
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
        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="font-bold text-surface-500">سفارشی نیست</p>
            <p className="text-sm text-surface-400 mt-1">{searchQuery ? 'جستجو نتیجه‌ای نداشت' : 'همه پردازش شده‌اند'}</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`سفارش ${selectedOrder?.orderNumber}`}
        footer={selectedOrder && statusMap[selectedOrder.status]?.next ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>بستن</Button>
            <Button className="flex-1" onClick={() => handleStatusChange(selectedOrder.id, statusMap[selectedOrder.status].next!)}>
              {statusMap[selectedOrder.status].nextLabel}
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setSelectedOrder(null)}>بستن</Button>
        )}>
        {selectedOrder && (
          <div className="p-5 space-y-4">
            <div className={cn('p-3 rounded-xl', statusMap[selectedOrder.status]?.bgColor || 'bg-surface-100')}>
              <p className={cn('font-bold', statusMap[selectedOrder.status]?.textColor || 'text-surface-600')}>{statusMap[selectedOrder.status]?.label || selectedOrder.status}</p>
              <p className="text-xs text-surface-400 mt-0.5">{dayjs(selectedOrder.createdAt).format('YYYY/MM/DD - HH:mm')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <p className="text-xs text-surface-400">مشتری</p>
                <p className="font-bold text-surface-900 dark:text-surface-100 mt-0.5">{selectedOrder.customerFirstName} {selectedOrder.customerLastName}</p>
              </div>
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <p className="text-xs text-surface-400">نوع</p>
                <p className="font-bold text-surface-900 dark:text-surface-100 mt-0.5">{selectedOrder.orderType === 'online' ? 'آنلاین' : 'حضوری'} · {selectedOrder.paymentMethod === 'cash' ? 'نقدی' : 'کارت'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {selectedOrder.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                  <span className="text-sm"><span className="font-bold">{item.quantity}×</span> {item.name}</span>
                  <span className="font-bold text-sm">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t-2 border-dashed border-surface-200 dark:border-surface-700 flex justify-between">
              <span className="font-bold text-surface-900 dark:text-surface-100">مبلغ نهایی</span>
              <span className="text-2xl font-black text-brand-600">{formatPrice(selectedOrder.total)}</span>
            </div>
            {selectedOrder.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-400">{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
