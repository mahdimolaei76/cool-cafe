/**
 * OrderDetailModal — مودال جزئیات سفارش
 * مشترک بین admin و cashier | ارتفاع ثابت | سکشن‌های قابل بستن/باز کردن
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, ChefHat, CheckCircle2, Truck, XCircle, MoreVertical,
  User, Phone, Package, Receipt, FileText, ShoppingBag,
  ChevronDown, ChevronUp, AlertCircle,
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
  icon: typeof Clock; color: string; bgColor: string; border: string;
}> = {
  pending:   { label: 'در انتظار',         variant: 'warning', icon: Clock,        color: 'text-amber-700',   bgColor: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800' },
  preparing: { label: 'در حال آماده‌سازی', variant: 'info',    icon: ChefHat,      color: 'text-blue-700',    bgColor: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
  ready:     { label: 'آماده تحویل',        variant: 'success', icon: CheckCircle2, color: 'text-emerald-700', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  delivered: { label: 'تحویل شده',          variant: 'default', icon: Truck,        color: 'text-zinc-600',    bgColor: 'bg-zinc-100 dark:bg-zinc-800',       border: 'border-zinc-200 dark:border-zinc-700' },
  cancelled: { label: 'لغو شده',            variant: 'danger',  icon: XCircle,      color: 'text-red-700',     bgColor: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800' },
};

export const paymentLabels: Record<string, string> = {
  cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر',
};

const nextStatusMap: Record<string, OrderStatus> = {
  pending: 'preparing', preparing: 'ready', ready: 'delivered',
};

// ── Section component ──
function Section({ title, icon: Icon, defaultOpen = true, accent, children }: {
  title: string; icon: typeof Clock; defaultOpen?: boolean; accent?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center justify-between px-4 py-3 text-right transition-colors',
          open ? 'bg-zinc-50 dark:bg-zinc-800/60' : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
        )}>
        <span className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-wide', accent || 'text-zinc-500 dark:text-zinc-400')}>
          <Icon className="w-3.5 h-3.5" />{title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {open && <div className="bg-white dark:bg-zinc-900">{children}</div>}
    </div>
  );
}

interface Props {
  order: Order;
  onStatusChange: (status: OrderStatus) => void;
}

export default function OrderDetailModal({ order, onStatusChange }: Props) {
  const cfg = statusConfig[order.status];
  const updateOrderItemPrice = useAppStore(s => s.updateOrderItemPrice);
  const fetchOrders = useAppStore(s => s.fetchOrders);
  const settings = useAppStore(s => s.settings);
  const user = useAuthStore(s => s.user);
  const isLocked = order.status === 'delivered' || order.status === 'cancelled';
  const nextStatus = nextStatusMap[order.status] as OrderStatus | undefined;

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // ── نوع تحویل ──
  const [isTakeaway, setIsTakeaway] = useState(order.isTakeaway);
  const [savingTakeaway, setSavingTakeaway] = useState(false);
  useEffect(() => { setIsTakeaway(order.isTakeaway); }, [order.id, order.isTakeaway]);

  // ── توضیحات داخلی ──
  const [staffNote, setStaffNote] = useState(order.staffNote || '');
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => { setStaffNote(order.staffNote || ''); }, [order.id, order.staffNote]);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const h = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [statusMenuOpen]);

  const handleTakeawayChange = async (val: boolean) => {
    if (val === isTakeaway || savingTakeaway) return;
    setIsTakeaway(val);
    setSavingTakeaway(true);
    try {
      await orderApi.updateTakeaway(order.id, val, user?.name ?? '');
      await fetchOrders();
      toast.success(val ? 'بیرون‌بر شد' : 'حضوری شد');
    } catch (err) {
      setIsTakeaway(!val);
      toast.error(err instanceof Error ? err.message : 'خطا');
    } finally { setSavingTakeaway(false); }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await orderApi.updateStaffNote(order.id, staffNote);
      await fetchOrders();
      toast.success('یادداشت ذخیره شد');
    } catch { toast.error('خطا در ذخیره یادداشت'); }
    finally { setSavingNote(false); }
  };

  const confirmItemPrice = async (itemId: string) => {
    const price = Number(priceDrafts[itemId]);
    if (Number.isNaN(price) || price < 0) { toast.error('قیمت معتبر وارد کنید'); return; }
    setSavingItemId(itemId);
    try { await updateOrderItemPrice(order.id, itemId, price); toast.success('قیمت ثبت شد'); }
    finally { setSavingItemId(null); }
  };

  const allStatuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
  const takeawayFeeNote = settings?.takeawayFeeEnabled && settings.takeawayFee > 0
    ? formatPrice(settings.takeawayFee) : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── نوار بالا — وضعیت فعلی + بج‌های نوع ── */}
      <div className={cn('px-5 py-3 flex items-center gap-3 border-b', cfg.bgColor, cfg.border)}>
        <cfg.icon className={cn('w-5 h-5 flex-shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className={cn('font-black text-sm', cfg.color)}>{cfg.label}</p>
          <p className="text-[11px] text-zinc-500">{formatJalaliDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {order.isUrgent && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">🔴 فوری</span>
          )}
          <Badge variant={order.orderType === 'online' ? 'info' : 'default'}>
            {order.orderType === 'online' ? 'آنلاین' : 'حضوری'}
          </Badge>
          {isTakeaway && <Badge variant="warning"><Package className="w-2.5 h-2.5 inline ml-0.5" />بیرون‌بر</Badge>}
        </div>
      </div>

      {/* ── اسکرول‌پذیر — همه سکشن‌ها ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">

          {/* ══ ۱. تغییر وضعیت ══ */}
          <Section title="تغییر وضعیت" icon={CheckCircle2} accent="text-brand-600 dark:text-brand-400">
            <div className="p-4 space-y-3">
              {isLocked ? (
                <p className="text-xs text-zinc-500 text-center py-2">این سفارش قفل است و وضعیت آن قابل تغییر نیست.</p>
              ) : (
                <>
                  {/* دکمه‌های اصلی */}
                  <div className="flex gap-2">
                    {nextStatus && (
                      <div className="relative flex-1">
                        <Button className="w-full" onClick={() => onStatusChange(nextStatus)}>
                          {statusConfig[nextStatus].label}
                        </Button>
                        <span className="absolute -top-2.5 right-1/2 translate-x-1/2 text-[9px] bg-brand-600 text-white px-1.5 rounded-full whitespace-nowrap">تغییر وضعیت به</span>
                      </div>
                    )}
                    <div className="relative">
                      <Button variant="danger" onClick={() => onStatusChange('cancelled')}>لغو</Button>
                      <span className="absolute -top-2.5 right-1/2 translate-x-1/2 text-[9px] bg-red-500 text-white px-1.5 rounded-full whitespace-nowrap">تغییر به</span>
                    </div>
                    <div className="relative" ref={statusMenuRef}>
                      <Button variant="outline" onClick={() => setStatusMenuOpen(v => !v)} className="!px-3" aria-label="سایر">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      <AnimatePresence>
                        {statusMenuOpen && (
                          <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.13 }}
                            className="absolute bottom-full mb-2 left-0 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-700 py-1.5 z-20">
                            <p className="px-3 py-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">تغییر مستقیم به:</p>
                            {allStatuses.filter(s => s !== order.status).map(s => {
                              const sc = statusConfig[s];
                              return (
                                <button key={s} onClick={() => { onStatusChange(s); setStatusMenuOpen(false); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-right hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
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

                  {/* نوع تحویل */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">نوع تحویل</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ val: false, label: 'در محل', icon: ShoppingBag }, { val: true, label: 'بیرون‌بر', icon: Package }].map(opt => (
                        <button key={String(opt.val)} disabled={savingTakeaway}
                          onClick={() => handleTakeawayChange(opt.val)}
                          className={cn('py-2.5 px-3 rounded-xl border-2 flex items-center justify-center gap-1.5 text-sm font-bold transition-all',
                            isTakeaway === opt.val
                              ? opt.val ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-600' : 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300',
                            savingTakeaway && 'opacity-60 cursor-not-allowed'
                          )}>
                          <opt.icon className="w-4 h-4" />{opt.label}
                          {isTakeaway === opt.val && savingTakeaway && <span className="text-[10px]">...</span>}
                        </button>
                      ))}
                    </div>
                    {isTakeaway && takeawayFeeNote && (
                      <p className="text-[11px] text-orange-600">هزینه بیرون‌بر از تنظیمات: {takeawayFeeNote}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* ══ ۲. اطلاعات مشتری ══ */}
          <Section title="اطلاعات مشتری" icon={User}>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-[10px] text-zinc-400 mb-1">نام مشتری</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{order.customerFirstName} {order.customerLastName}</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-[10px] text-zinc-400 mb-1">تلفن</p>
                  <p className="font-bold text-sm font-mono text-zinc-900 dark:text-zinc-100" dir="ltr">{order.customerPhone || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">پرداخت</p>
                  <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">{paymentLabels[order.paymentMethod] ?? '—'}</p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">پرداخت شد</p>
                  <p className={cn('text-xs font-black', order.isPaid ? 'text-emerald-600' : 'text-red-500')}>{order.isPaid ? '✅ بله' : '❌ خیر'}</p>
                </div>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
                  <p className="text-[10px] text-zinc-400 mb-0.5">صندوق‌دار</p>
                  <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 truncate">{order.cashier || '—'}</p>
                </div>
              </div>
              {/* یادداشت مشتری */}
              {order.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] text-amber-600 font-bold mb-1">📋 یادداشت مشتری</p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{order.notes}</p>
                </div>
              )}
            </div>
          </Section>

          {/* ══ ۳. آیتم‌ها ══ */}
          <Section title={`آیتم‌ها (${order.items?.length ?? 0})`} icon={Receipt} accent="text-zinc-700 dark:text-zinc-300">
            <div className="p-4 space-y-2">
              {order.items?.map(item => {
                const needsPricing = item.isPriceVariable && !item.priceConfirmed;
                return (
                  <div key={item.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    needsPricing ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' : 'bg-zinc-50 dark:bg-zinc-800/50'
                  )}>
                    <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center text-xs font-black text-brand-700 flex-shrink-0">
                      {item.quantity}×
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      {needsPricing
                        ? <p className="text-xs text-amber-600 font-bold">{item.priceLabel || 'نیاز به قیمت‌گذاری'}</p>
                        : <p className="text-xs text-zinc-400">{formatPrice(item.price)} / واحد</p>}
                    </div>
                    {needsPricing ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input type="number" inputMode="numeric" placeholder="قیمت"
                          value={priceDrafts[item.id] ?? ''}
                          onChange={e => setPriceDrafts(p => ({ ...p, [item.id]: e.target.value }))}
                          className="w-24 px-2 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-800 focus:outline-none" />
                        <Button size="sm" onClick={() => confirmItemPrice(item.id)} loading={savingItemId === item.id} className="!py-1.5 !rounded-lg">ثبت</Button>
                      </div>
                    ) : (
                      <p className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex-shrink-0">{formatPrice(item.subtotal)}</p>
                    )}
                  </div>
                );
              })}

              {/* جمع آیتم‌ها */}
              <div className="mt-3 pt-3 border-t-2 border-zinc-200 dark:border-zinc-700 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">جمع اقلام</span>
                  <span className="font-bold">{formatPrice(order.subtotal)}</span>
                </div>
                {(order.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>تخفیف</span><span>−{formatPrice(order.discount)}</span>
                  </div>
                )}
                {(order.serviceCharge ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>سرویس</span><span>+{formatPrice(order.serviceCharge)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-base font-black text-zinc-900 dark:text-zinc-100">مبلغ نهایی</span>
                  <span className="text-xl font-black text-brand-600">{formatPrice(order.total)}</span>
                </div>
              </div>

              {order.items?.some(i => i.isPriceVariable && !i.priceConfirmed) && (
                <Banner variant="warning">مبلغ نهایی شامل اقلام قیمت‌گذاری‌نشده نیست.</Banner>
              )}
            </div>
          </Section>

          {/* ══ ۴. پرداخت و مالی ══ */}
          <Section title="پرداخت و مالی" icon={AlertCircle} defaultOpen={!isLocked}>
            <div className="p-4 space-y-3">
              <OrderPaymentPanel order={order} />
              <OrderPricePanel order={order} />
            </div>
          </Section>

          {/* ══ ۵. یادداشت داخلی ══ */}
          <Section title="توضیحات داخلی سفارش" icon={FileText} defaultOpen={!!order.staffNote}>
            <div className="p-4 space-y-2">
              <p className="text-[11px] text-zinc-400">این توضیحات برای کارکنان است و به مشتری نمایش داده نمی‌شود.</p>
              <textarea
                value={staffNote}
                onChange={e => setStaffNote(e.target.value)}
                rows={3}
                disabled={isLocked}
                placeholder="توضیحات داخلی برای تیم..."
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none disabled:opacity-50"
              />
              {!isLocked && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveNote} loading={savingNote} disabled={staffNote === (order.staffNote || '')}>ذخیره یادداشت</Button>
                </div>
              )}
            </div>
          </Section>

          {/* ══ ۶. تاریخچه وضعیت ══ */}
          <Section title="تاریخچه وضعیت" icon={Clock} defaultOpen={false}>
            <div className="p-4 space-y-2.5">
              {order.timeline?.map((ev, i) => {
                const ec = statusConfig[ev.status];
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1', ec.bgColor, 'ring-2 ring-white dark:ring-zinc-900 border', ec.border)} />
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ec.label}</p>
                      <p className="text-xs text-zinc-400">{formatJalali(ev.timestamp, 'HH:mm - YYYY/MM/DD')}</p>
                      {ev.note && <p className="text-xs text-zinc-500 mt-0.5 italic">{ev.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
