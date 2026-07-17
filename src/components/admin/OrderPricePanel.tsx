import { useState } from 'react';
import { toast } from 'sonner';
import { DollarSign, Wrench, AlertTriangle, Clock, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { fromNowFa } from '@/utils/jalali';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Order, OrderPaymentEvent } from '@/types';

const kindLabel: Record<string, string> = {
  price_override: 'تغییر مبلغ',
  payment_method: 'تغییر روش پرداخت',
  paid: 'وضعیت پرداخت',
  service_charge: 'تغییر سرویس',
  takeaway_override: 'حق‌الخدمه بیرون‌بر',
  item_service_deleted: 'حذف سرویس آیتم',
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر',
};

function fmt(kind: string, val: string): string {
  if (!val) return '—';
  if (kind === 'payment_method') return paymentMethodLabel[val] ?? val;
  if (kind === 'paid') return val === 'true' ? 'پرداخت شد' : 'پرداخت نشد';
  if (kind === 'takeaway_override') return val === 'true' ? 'فعال' : 'غیرفعال';
  const n = parseInt(val);
  return isNaN(n) ? val : formatPrice(n);
}

const locked = (o: Order) => o.status === 'delivered' || o.status === 'cancelled';

/**
 * OrderPricePanel — نمایش اطلاعات مالی سفارش، امکان تغییر مبلغ کل،
 * اضافه کردن حق‌الخدمه بیرون‌بر، و لاگ تاریخچه عملیات پرداخت.
 * استفاده در مودال جزئیات سفارش (مدیر و صندوق‌دار).
 */
export default function OrderPricePanel({ order }: { order: Order }) {
  const fetchOrders = useAppStore(s => s.fetchOrders);
  const user = useAuthStore(s => s.user);
  const isLocked = locked(order);

  // تغییر مبلغ کل
  const [newTotal, setNewTotal] = useState('');
  const [confirmTotal, setConfirmTotal] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);

  // سرویس کل سفارش
  const [serviceCharge, setServiceCharge] = useState(String(order.serviceCharge ?? 0));
  const [savingService, setSavingService] = useState(false);

  // حق‌الخدمه بیرون‌بر
  const [takeawayOverride, setTakeawayOverride] = useState(!!order.takeawayOverride);
  const [takeawayFee, setTakeawayFee] = useState(String(order.takeawayFee ?? 0));
  const [savingTakeaway, setSavingTakeaway] = useState(false);
  const [confirmTakeaway, setConfirmTakeaway] = useState(false);

  // نمایش لاگ پرداخت
  const [logExpanded, setLogExpanded] = useState(false);

  const handleUpdateTotal = async () => {
    const n = parseInt(newTotal.replace(/[^0-9]/g, ''));
    if (isNaN(n) || n < 0) { toast.error('مبلغ نامعتبر است'); return; }
    setSavingTotal(true);
    try {
      await orderApi.updateTotal(order.id, n, user?.name ?? '');
      await fetchOrders();
      setNewTotal('');
      setConfirmTotal(false);
      toast.success('مبلغ سفارش بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ذخیره مبلغ');
    } finally {
      setSavingTotal(false);
    }
  };

  const handleUpdateService = async () => {
    const n = parseInt(serviceCharge.replace(/[^0-9]/g, '')) || 0;
    setSavingService(true);
    try {
      await orderApi.updateServiceCharge(order.id, n, user?.name ?? '');
      await fetchOrders();
      toast.success('سرویس بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ذخیره سرویس');
    } finally {
      setSavingService(false);
    }
  };

  const handleUpdateTakeaway = async () => {
    const fee = parseInt(takeawayFee.replace(/[^0-9]/g, '')) || 0;
    if (!takeawayOverride && fee > 0) {
      toast.error('ابتدا حق‌الخدمه بیرون‌بر را فعال کنید');
      return;
    }
    setSavingTakeaway(true);
    try {
      await orderApi.updateTakeawayOverride(order.id, takeawayOverride, takeawayOverride ? fee : 0, user?.name ?? '');
      await fetchOrders();
      setConfirmTakeaway(false);
      toast.success('حق‌الخدمه بیرون‌بر بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ذخیره حق‌الخدمه');
    } finally {
      setSavingTakeaway(false);
    }
  };

  const events: OrderPaymentEvent[] = order.paymentEvents ?? [];

  return (
    <div className="space-y-3">
      {/* ── خلاصه مالی ── */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">جمع اقلام</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>تخفیف</span>
            <span>− {formatPrice(order.discount)}</span>
          </div>
        )}
        {(order.serviceCharge ?? 0) > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>سرویس</span>
            <span>+ {formatPrice(order.serviceCharge)}</span>
          </div>
        )}
        {order.takeawayOverride && (order.takeawayFee ?? 0) > 0 && (
          <div className="flex justify-between text-amber-600">
            <span className="flex items-center gap-1"><Package className="w-3 h-3" />بیرون‌بر</span>
            <span>+ {formatPrice(order?.takeawayFee || 0)}</span>
          </div>
        )}
        {order.priceOverride != null && (
          <div className="flex justify-between text-blue-600">
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />مبلغ دستی</span>
            <span>{formatPrice(order.priceOverride)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-base pt-1 border-t border-zinc-200 dark:border-zinc-700">
          <span>مبلغ نهایی</span>
          <span className="text-brand-600">{formatPrice(order.total)}</span>
        </div>
      </div>

      {!isLocked && (
        <>
          {/* ── سرویس کل سفارش ── */}
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
            <p className="text-xs font-bold text-zinc-500">هزینه سرویس (کل سفارش)</p>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="مبلغ سرویس (تومان)"
                value={serviceCharge}
                onChange={e => setServiceCharge(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                onClick={handleUpdateService}
                disabled={savingService}
                className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {savingService ? '...' : 'ثبت'}
              </button>
            </div>
          </div>

          {/* ── حق‌الخدمه بیرون‌بر ── */}
          {order.isTakeaway && (
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-green-200 dark:border-green-800 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-green-600">حق‌الخدمه بیرون‌بر</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={takeawayOverride}
                    onChange={e => setTakeawayOverride(e.target.checked)}
                    className="w-4 h-4 rounded"
                    disabled={savingTakeaway}
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">فعال</span>
                </label>
              </div>
              {takeawayOverride && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="مبلغ حق‌الخدمه (تومان)"
                    value={takeawayFee}
                    onChange={e => setTakeawayFee(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    onClick={() => setConfirmTakeaway(true)}
                    disabled={savingTakeaway}
                    className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {savingTakeaway ? '...' : 'ثبت'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── تغییر مبلغ دستی ── */}
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
            <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />تغییر مبلغ کل (دستی)
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder={`مبلغ جدید — فعلی: ${formatPrice(order.total)}`}
                value={newTotal}
                onChange={e => setNewTotal(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                disabled={!newTotal || savingTotal}
                onClick={() => setConfirmTotal(true)}
                className="px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {savingTotal ? '...' : 'تغییر'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── لاگ رویدادهای پرداخت ── */}
      {events.length > 0 && (
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 overflow-hidden">
          <button
            onClick={() => setLogExpanded(e => !e)}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold"
          >
            <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />تاریخچه عملیات مالی ({events.length})</span>
            {logExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {logExpanded && (
            <div className="divide-y divide-blue-50 dark:divide-blue-900/30 bg-white dark:bg-zinc-900">
              {events.map(ev => (
                <div key={ev.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{kindLabel[ev.kind] ?? ev.kind}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 break-words">
                      {fmt(ev.kind, ev.oldValue)} → {fmt(ev.kind, ev.newValue)}
                      {ev.cashier && <span className="mr-1 text-zinc-300"> · {ev.cashier}</span>}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0 flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />{fromNowFa(ev.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmTotal}
        onClose={() => setConfirmTotal(false)}
        onConfirm={handleUpdateTotal}
        title="تغییر مبلغ سفارش"
        message={`آیا مطمئنید می‌خواهید مبلغ این سفارش را به ${formatPrice(parseInt(newTotal.replace(/[^0-9]/g, '') || '0'))} تغییر دهید؟`}
        confirmText="بله، تغییر بده"
      />

      <ConfirmDialog
        open={confirmTakeaway}
        onClose={() => setConfirmTakeaway(false)}
        onConfirm={handleUpdateTakeaway}
        title="حق‌الخدمه بیرون‌بر"
        message={`آیا مطمئنید می‌خواهید حق‌الخدمه بیرون‌بر را ${takeawayOverride ? 'به ' + formatPrice(parseInt(takeawayFee.replace(/[^0-9]/g, '') || '0')) : 'غیرفعال'} کنید؟`}
        confirmText="بله، ثبت بده"
      />
    </div>
  );
}
