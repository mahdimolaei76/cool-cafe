import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, Clock, CheckCircle2, XCircle, Truck, ChefHat, RefreshCw, Receipt, Package } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import Separator from '@/components/ui/Separator';
import OrderDetailModal, { statusConfig } from '@/components/admin/OrderDetailModal';
import { fromNowFa } from '@/utils/jalali';
import type { Order, OrderStatus } from '@/types';

export default function OrderManagement() {
  const { orders: rawOrders, updateOrderStatus, loading } = useAppStore();
  const orders = rawOrders ?? [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders.find(o => o.id === selectedOrderId) ?? null : null),
    [orders, selectedOrderId]
  );
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; status: OrderStatus } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => {
    let r = orders;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerFirstName.toLowerCase().includes(q) ||
        o.customerLastName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    }
    if (statusFilter) r = r.filter(o => o.status === statusFilter);
    return r;
  }, [orders, search, statusFilter]);

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

  const nextStatus: Record<string, OrderStatus> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const activeOrders = filtered.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">مدیریت سفارش‌ها</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {statusCounts['pending'] || 0} در انتظار · {statusCounts['preparing'] || 0} در حال آماده‌سازی · {statusCounts['ready'] || 0} آماده
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} icon={<RefreshCw className="w-4 h-4" />}>بروزرسانی</Button>
      </div>

      <Separator />

      {/* فیلتر وضعیت */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(['', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const).map(status => {
          const cfg = status ? statusConfig[status] : null;
          const count = status ? (statusCounts[status] || 0) : orders.length;
          const isActive = statusFilter === status;
          const borderMap: Record<string, string> = { pending: 'border-amber-500', preparing: 'border-blue-500', ready: 'border-emerald-500', delivered: 'border-zinc-500', cancelled: 'border-red-500' };
          const textMap: Record<string, string> = { pending: 'text-amber-700 dark:text-amber-400', preparing: 'text-blue-700 dark:text-blue-400', ready: 'text-emerald-700 dark:text-emerald-400', delivered: 'text-zinc-700 dark:text-zinc-300', cancelled: 'text-red-700 dark:text-red-400' };
          return (
            <button key={status || 'all'} onClick={() => setStatusFilter(status)}
              className={cn('p-3 rounded-2xl border-2 transition-all text-right',
                isActive ? cn(borderMap[status] || 'border-brand-500', cfg?.bgColor || 'bg-brand-50 dark:bg-brand-900/30', 'shadow-md')
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 bg-white dark:bg-zinc-900')}>
              <div className="flex items-center justify-between mb-1.5">
                {cfg ? <cfg.icon className={cn('w-4 h-4', isActive ? textMap[status] : cfg.color)} /> : <Receipt className={cn('w-4 h-4', isActive ? 'text-brand-600' : 'text-zinc-400')} />}
                <span className={cn('text-xl font-black', isActive ? (textMap[status] || 'text-brand-700') : 'text-zinc-900 dark:text-zinc-100')}>{count}</span>
              </div>
              <p className={cn('text-xs font-bold', isActive ? (textMap[status] || 'text-brand-700') : 'text-zinc-500 dark:text-zinc-400')}>
                {cfg?.label || 'همه'}
              </p>
            </button>
          );
        })}
      </div>

      <Separator />
      <Input type="text" placeholder="جستجو با شماره سفارش، نام یا تلفن..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search className="w-5 h-5" />} />

      {/* سفارشات فعال */}
      {activeOrders.length > 0 && !statusFilter && (
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3">سفارش‌های فعال</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {activeOrders.slice(0, 6).map((order, i) => (
                <OrderCard key={order.id} order={order} index={i}
                  onView={() => setSelectedOrderId(order.id)}
                  onStatusChange={status => setConfirmAction({ orderId: order.id, status })}
                  nextStatus={nextStatus[order.status] as OrderStatus} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <Separator />

      {/* جدول همه سفارشات */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {statusFilter ? statusConfig[statusFilter].label : 'همه سفارش‌ها'} ({filtered.length})
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
              {loading && orders.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    <td colSpan={7} className="py-3 px-4"><div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? paginated.map(order => (
                <tr key={order.id} onClick={() => setSelectedOrderId(order.id)}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-black text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-700 px-2.5 py-1 rounded-full" dir="ltr">
                      #{order.orderNumber.replace('COOL-', '')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
                    <p className="text-xs text-zinc-400" dir="ltr">{order.customerPhone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={statusConfig[order.status].variant} dot>{statusConfig[order.status].label}</Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-col gap-1">
                      <Badge variant={order.orderType === 'online' ? 'info' : 'default'}>
                        {order.orderType === 'online' ? 'آنلاین' : 'حضوری'}
                      </Badge>
                      {order.isTakeaway && (
                        <Badge variant="warning"><Package className="w-2.5 h-2.5 inline ml-0.5" />بیرون‌بر</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(order.total)}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-zinc-400 text-xs">{fromNowFa(order.createdAt)}</td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedOrderId(order.id)}>جزئیات</Button>
                      {nextStatus[order.status] && (
                        <Button size="sm" onClick={() => setConfirmAction({ orderId: order.id, status: nextStatus[order.status] })}>
                          {statusConfig[nextStatus[order.status]].label}
                        </Button>
                      )}
                    </div>
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
        <Pagination page={page} pageSize={pageSize} total={filtered.length}
          onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1); }}
          className="border-t border-zinc-100 dark:border-zinc-800" />
      </div>

      {/* مودال جزئیات */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrderId(null)}
        title={`سفارش ${selectedOrder?.orderNumber ?? ''}`} size="lg">
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onStatusChange={status => setConfirmAction({ orderId: selectedOrder.id, status })}
            nextStatus={nextStatus[selectedOrder.status] as OrderStatus | undefined}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleStatusChange}
        title="تغییر وضعیت سفارش"
        message={confirmAction ? `وضعیت سفارش به "${statusConfig[confirmAction.status].label}" تغییر کند؟` : ''}
        confirmText="تأیید"
        variant={confirmAction?.status === 'cancelled' ? 'danger' : 'primary'}
      />
    </div>
  );
}

function OrderCard({ order, index, onView, onStatusChange, nextStatus }: {
  order: Order; index: number; onView: () => void;
  onStatusChange: (s: OrderStatus) => void; nextStatus?: OrderStatus;
}) {
  const config = statusConfig[order.status];
  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.05 }}
      onClick={onView}
      className={cn('p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg', config.bgColor, 'border-transparent hover:border-brand-300 dark:hover:border-brand-700')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-mono text-sm font-bold bg-white dark:bg-zinc-800 px-2 py-1 rounded" dir="ltr">{order.orderNumber}</span>
          <p className="text-xs text-zinc-400 mt-1.5">{fromNowFa(order.createdAt)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={config.variant} dot>{config.label}</Badge>
          {order.isTakeaway && <Badge variant="warning"><Package className="w-2.5 h-2.5 inline ml-0.5" />بیرون‌بر</Badge>}
        </div>
      </div>
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
      <p className="text-xs text-zinc-400 mb-3">{order.items?.length} آیتم</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(order.total)}</span>
        {nextStatus && (
          <Button size="sm" onClick={e => { e.stopPropagation(); onStatusChange(nextStatus); }}>
            {statusConfig[nextStatus].label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
