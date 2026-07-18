/**
 * OrderDetailModal — محتوای مودال جزئیات سفارش (مشترک admin/cashier).
 * سکشن‌بندی: وضعیت | اطلاعات مشتری | پرداخت+مالی | آیتم‌ها | یادداشت | تاریخچه
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, ChefHat, CheckCircle2, Truck, XCircle, MoreVertical,
  User, Phone, Package, Receipt, FileText, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { orderApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Banner from '@/components/ui/Banner';
import OrderPaymentPanel from './OrderPaymentPanel';
import OrderPricePanel from './OrderPricePanel';
import { formatJalaliDateTime, formatJalali } from '@/utils/jalali';
import type { Order, OrderStatus } from '@/types';

export const statusConfig: Record<OrderStatus, {
  label: string; variant: 'warning' | 'info' | 'success' | 'default' | 'danger';
  icon: typeof Clock; color: string; bgColor: string;
}> = {
  pending:   { label: 'در انتظار',         variant: 'warning', icon: Clock,        color: 'text-amber-600',   bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  preparing: { label: 'در حال آماده‌سازی', variant: 'info',    icon: ChefHat,      color: 'text-blue-600',    bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  ready:     { label: 'آماده تحویل',        variant: 'success', icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' },
  delivered: { label: 'تحویل شده',          variant: 'default', icon: Truck,        color: 'text-zinc-600',    bgColor: 'bg-zinc-100 dark:bg-zinc-800' },
  cancelled: { label: 'لغو شده',            variant: 'danger',  icon: XCircle,      color: 'text-red-600',     bgColor: 'bg-red-50 dark:bg-red-900/30' },
};

export const paymentLabels: Record<string, string> = {
  cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر',
};

interface Props {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
  nextStatus?: OrderStatus;
}

export default function OrderDetailModal({ order, onStatusChange, nextStatus }: Props) {
  const config = statusConfig[order.status];
  const updateOrderItemPrice = useAppStore(s => s.updateOrderItemPrice);
  const fetchOrders = useAppStore(s => s.fetchOrders);
  const updateOrderTakeaway = useAppStore(s => s.updateOrderTakeaway);
  const settings = useAppStore(s => s.settings);
  const user = useAuthStore(s => s.user);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const isLocked = order.status === 'delivered' || order.status === 'cancelled';

  // ── تغییر نوع تحویل ──
  const [isTakeaway, setIsTakeaway] = useState(order.isTakeaway);
  const [savingTakeaway, setSavingTakeaway] = useState(false);

  // sync اگر order از outside تغییر کرد
  useEffect(() => { setIsTakeaway(order.isTakeaway); }, [order.id, order.isTakeaway]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node))
        setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusMenuOpen]);

  const handleTakeawayChange = async (val: boolean) => {
    if (val === isTakeaway) return;
    setIsTakeaway(val);
    setSavingTakeaway(true);
    try {
      await updateOrderTakeaway(order.id, val, user?.name ?? '');
      toast.success(val ? 'سفارش به بیرون‌بر تغییر یافت' : 'سفارش به حضوری تغییر یافت');
    } catch (err) {
      setIsTakeaway(!val); // rollback
      toast.error(err instanceof Error ? err.message : 'خطا در تغییر نوع تحویل');
    } finally {
      setSavingTakeaway(false);
    }
  };

  const confirmItemPrice = async (itemId: string) => {
    const raw = priceDrafts[itemId];
    const price = Number(raw);
    if (!raw || Number.isNaN(price) || price < 0) { toast.error('قیمت معتبر وارد کنید'); return; }
    setSavingItemId(itemId);
    try {
      await updateOrderItemPrice(order.id, itemId, price);
      toast.success('قیمت ثبت شد');
    } finally { setSavingItemId(null); }
  };

  const allStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];

  // هزینه بیرون‌بر از settings
  const takeawayFeeNote = settings?.takeawayFeeEnabled && settings.takeawayFee > 0
    ? `هزینه بیرون‌بر: ${formatPrice(settings.takeawayFee)} اضافه می‌شود`
    : null;

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">

      {/* ══ ۱. وضعیت + نوع تحویل + اکشن‌ها ══ */}
      <div className="p-5 space-y-3">

        {/* هدر وضعیت */}
        <div className={cn('p-3.5 rounded-xl flex items-center gap-3', config.bgColor)}>
          <config.icon className={cn('w-5 h-5 flex-shrink-0', config.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn('font-bold text-sm', config.color)}>{config.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{formatJalaliDateTime(order.createdAt)}</p>
          </div>
          <Badge variant={order.orderType === 'online' ? 'info' : 'default'}>
            {order.orderType === 'online' ? 'آنلاین' : 'حضوری'}
          </Badge>
        </div>

        {/* نوع تحویل — قابل تغییر */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-2">
          <p className="text-xs font-bold text-zinc-500">نوع تحویل</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isLocked || savingTakeaway}
              onClick={() => handleTakeawayChange(false)}
              className={cn(
                'py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-sm font-bold transition-all',
                !isTakeaway
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300',
                (isLocked || savingTakeaway) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ShoppingBag className="w-4 h-4" />در محل
            </button>
            <button
              disabled={isLocked || savingTakeaway}
              onClick={() => handleTakeawayChange(true)}
              className={cn(
                'py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-sm font-bold transition-all',
                isTakeaway
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300',
                (isLocked || savingTakeaway) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Package className="w-4 h-4" />بیرون‌بر
              {savingTakeaway && <span className="text-[10px] mr-1">...</span>}
            </button>
          </div>
          {isTakeaway && takeawayFeeNote && (
            <p className="text-[11px] text-orange-600 dark:text-orange-400">{takeawayFeeNote}</p>
          )}
        </div>

        {/* دکمه‌های تغییر وضعیت */}
        {!isLocked && (
          <div className="flex gap-2">
            {nextStatus && (
              <Button className="flex-1" onClick={() => onStatusChange(nextStatus)}>
                {statusConfig[nextStatus].label}
              </Button>
            )}
            <Button variant="danger" onClick={() => onStatusChange('cancelled')}>لغو</Button>
            <div className="relative" ref={statusMenuRef}>
              <Button variant="outline" onClick={() => setStatusMenuOpen(v => !v)} className="!px-3" aria-label="وضعیت دیگر">
                <MoreVertical className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {statusMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-2 left-0 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-700 py-1.5 z-20"
                  >
                    <p className="px-3 py-1.5 text-[10px] text-zinc-400 font-medium uppercase tracking-wider">تغییر مستقیم به:</p>
                    {allStatuses.filter(s => s !== order.status).map(s => {
                      const sc = statusConfig[s];
                      return (
                        <button key={s} onClick={() => { onStatusChange(s); setStatusMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-right hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                          <sc.icon className={cn('w-4 h-4', sc.color)} />
                          <span className="text-zinc-700 dark:text-zinc-200">{sc.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ══ ۲. اطلاعات مشتری ══ */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">اطلاعات مشتری</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1"><User className="w-3.5 h-3.5 text-zinc-400" /><p className="text-[11px] text-zinc-400">مشتری</p></div>
            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
          </div>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1"><Phone className="w-3.5 h-3.5 text-zinc-400" /><p className="text-[11px] text-zinc-400">تلفن</p></div>
            <p className="font-medium text-sm font-mono text-zinc-900 dark:text-zinc-100" dir="ltr">{order.customerPhone || '—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
            <p className="text-[10px] text-zinc-400 mb-0.5">روش پرداخت</p>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{paymentLabels[order.paymentMethod] ?? '—'}</p>
          </div>
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
            <p className="text-[10px] text-zinc-400 mb-0.5">پرداخت شد</p>
            <p className={cn('text-xs font-bold', order.isPaid ? 'text-emerald-600' : 'text-red-500')}>{order.isPaid ? '✅ بله' : '❌ خیر'}</p>
          </div>
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
            <p className="text-[10px] text-zinc-400 mb-0.5">صندوق‌دار</p>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{order.cashier || '—'}</p>
          </div>
        </div>
      </div>

      {/* ══ ۳. پرداخت + مالی ══ */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">پرداخت و مالی</p>
        <OrderPaymentPanel order={order} />
        <OrderPricePanel order={order} />
      </div>

      {/* ══ ۴. آیتم‌ها ══ */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" />آیتم‌ها ({order.items?.length})
        </p>
        <div className="space-y-2">
          {order.items?.map(item => {
            const needsPricing = item.isPriceVariable && !item.priceConfirmed;
            return (
              <div key={item.id} className={cn(
                'flex items-center justify-between p-3 rounded-xl gap-3',
                needsPricing
                  ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                  : 'bg-zinc-50 dark:bg-zinc-800/50'
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center text-xs font-black text-brand-700 dark:text-brand-400 flex-shrink-0">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                    {needsPricing
                      ? <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{item.priceLabel || 'نیاز به قیمت‌گذاری'}</p>
                      : <p className="text-xs text-zinc-400">{formatPrice(item.price)} / واحد</p>}
                  </div>
                </div>
                {needsPricing ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number" inputMode="numeric" placeholder="قیمت واحد"
                      value={priceDrafts[item.id] ?? ''}
                      onChange={e => setPriceDrafts(p => ({ ...p, [item.id]: e.target.value }))}
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    <Button size="sm" onClick={() => confirmItemPrice(item.id)} loading={savingItemId === item.id} className="!rounded-lg !py-1.5">ثبت</Button>
                  </div>
                ) : (
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex-shrink-0">{formatPrice(item.subtotal)}</p>
                )}
              </div>
            );
          })}
        </div>

        {order.items?.some(i => i.isPriceVariable && !i.priceConfirmed) && (
          <Banner variant="warning">مبلغ زیر شامل قیمت اقلام قیمت‌گذاری‌نشده نیست.</Banner>
        )}

        <div className="pt-2 space-y-1.5 text-sm border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex justify-between"><span className="text-zinc-500">جمع اقلام</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف</span><span>−{formatPrice(order.discount)}</span></div>}
          {(order.serviceCharge ?? 0) > 0 && <div className="flex justify-between text-amber-600"><span>سرویس</span><span>+{formatPrice(order.serviceCharge)}</span></div>}
          <div className="flex justify-between font-black text-base pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span>مبلغ نهایی</span><span className="text-brand-600">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ══ ۵. یادداشت ══ */}
      {order.notes && (
        <div className="p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5" />یادداشت
          </p>
          <Banner variant="warning">{order.notes}</Banner>
        </div>
      )}

      {/* ══ ۶. تاریخچه وضعیت ══ */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">تاریخچه وضعیت</p>
        <div className="space-y-2.5">
          {order.timeline?.map((ev, i) => {
            const ec = statusConfig[ev.status];
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-zinc-900', ec.bgColor)} />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ec.label}</p>
                  <p className="text-xs text-zinc-400">{formatJalali(ev.timestamp, 'HH:mm - YYYY/MM/DD')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
