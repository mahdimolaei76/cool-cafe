import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Wrench, Settings2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { fromNowFa } from '@/utils/jalali';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Order, OrderPaymentEvent } from '@/types';

const kindLabel: Record<string, string> = {
  price_override: 'تغییر مبلغ کل',
  payment_method: 'تغییر روش پرداخت',
  paid: 'وضعیت پرداخت',
  service_charge: 'تغییر هزینه سرویس',
  takeaway_changed: 'تغییر نوع تحویل',
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر',
};

function fmtEventValue(kind: string, val: string): string {
  if (!val && val !== '0') return '—';
  if (kind === 'payment_method') return paymentMethodLabel[val] ?? val;
  if (kind === 'paid') return val === 'true' ? '✅ پرداخت شد' : '❌ پرداخت نشد';
  const n = parseInt(val);
  return isNaN(n) ? val : formatPrice(n);
}

const isLocked = (o: Order) => o.status === 'delivered' || o.status === 'cancelled';

export default function OrderPricePanel({ order }: { order: Order }) {
  const fetchOrders = useAppStore(s => s.fetchOrders);
  const user = useAuthStore(s => s.user);
  const locked = isLocked(order);

  // ── سرویس (با چک‌باکس) ──
  const [serviceEnabled, setServiceEnabled] = useState((order.serviceCharge ?? 0) > 0);
  const [serviceAmount, setServiceAmount] = useState(String(order.serviceCharge ?? 0));
  const [savingService, setSavingService] = useState(false);

  // ── تغییر مبلغ دستی ──
  const [newTotal, setNewTotal] = useState('');
  const [confirmTotal, setConfirmTotal] = useState(false);
  const [savingTotal, setSavingTotal] = useState(false);

  // ── لاگ ──
  const [logOpen, setLogOpen] = useState(false);

  const handleSaveService = async () => {
    const amount = serviceEnabled ? (parseInt(serviceAmount.replace(/[^0-9]/g, '')) || 0) : 0;
    setSavingService(true);
    try {
      await orderApi.updateServiceCharge(order.id, amount, user?.name ?? '');
      await fetchOrders();
      toast.success('هزینه سرویس بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ذخیره سرویس');
    } finally {
      setSavingService(false);
    }
  };

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

  const events: OrderPaymentEvent[] = order.paymentEvents ?? [];

  return (
    <div className="space-y-3">

      {/* ── خلاصه مالی ── */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">جمع اقلام</span>
          <span className="font-medium">{formatPrice(order.subtotal)}</span>
        </div>
        {(order.discount ?? 0) > 0 && (
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
        {order.priceOverride != null && (
          <div className="flex justify-between text-blue-600 text-xs">
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />مبلغ دستی اعمال شده</span>
            <span>{formatPrice(order.priceOverride)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-base pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <span>مبلغ نهایی</span>
          <span className="text-brand-600">{formatPrice(order.total)}</span>
        </div>
      </div>

      {!locked && (
        <>
          {/* ── هزینه سرویس ── */}
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />هزینه سرویس
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceEnabled}
                  onChange={e => {
                    setServiceEnabled(e.target.checked);
                    if (!e.target.checked) setServiceAmount('0');
                  }}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 select-none">فعال</span>
              </label>
            </div>

            {serviceEnabled && (
              <div className="flex gap-2">
                <input
                  type="number" inputMode="numeric"
                  placeholder="مبلغ سرویس (تومان)"
                  value={serviceAmount}
                  onChange={e => setServiceAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={handleSaveService} disabled={savingService}
                  className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {savingService ? '...' : 'ثبت'}
                </button>
              </div>
            )}

            {!serviceEnabled && (order.serviceCharge ?? 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">سرویس فعلی: {formatPrice(order.serviceCharge)}</span>
                <button
                  onClick={handleSaveService} disabled={savingService}
                  className="px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  {savingService ? '...' : 'حذف سرویس'}
                </button>
              </div>
            )}
          </div>

          {/* ── تغییر مبلغ دستی ── */}
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-amber-200 dark:border-amber-800/50 space-y-2">
            <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />تغییر مبلغ کل (دستی)
            </p>
            <div className="flex gap-2">
              <input
                type="number" inputMode="numeric"
                placeholder={`مبلغ جدید — فعلی: ${formatPrice(order.total)}`}
                value={newTotal}
                onChange={e => setNewTotal(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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

      {/* ── تاریخچه عملیات مالی ── */}
      {events.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <button
            onClick={() => setLogOpen(v => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-xs font-bold"
          >
            <span>تاریخچه عملیات مالی ({events.length})</span>
            {logOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {logOpen && (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {events.map(ev => (
                <div key={ev.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{kindLabel[ev.kind] ?? ev.kind}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {fmtEventValue(ev.kind, ev.oldValue)} ← {fmtEventValue(ev.kind, ev.newValue)}
                      {ev.cashier && <span className="mr-1.5 opacity-60">· {ev.cashier}</span>}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 flex-shrink-0 flex items-center gap-0.5 mt-0.5">
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
        message={`آیا مطمئنید می‌خواهید مبلغ را به ${formatPrice(parseInt(newTotal.replace(/[^0-9]/g, '') || '0'))} تغییر دهید؟`}
        confirmText="بله، تغییر بده"
      />
    </div>
  );
}
