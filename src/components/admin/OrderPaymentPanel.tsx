import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wallet, Banknote, CreditCard, Smartphone, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { customerApi } from '@/lib/api';
import type { Order, PaymentMethod } from '@/types';

// چهار روش اصلی + یک گزینه کوچک‌تر «سایر». اعتباری فقط وقتی مشتری این
// قابلیت را فعال داشته باشد قابل انتخاب است.
const mainMethods: { v: PaymentMethod; l: string; i: any }[] = [
  { v: 'cash', l: 'نقدی', i: Banknote },
  { v: 'card', l: 'کارت', i: CreditCard },
  { v: 'online', l: 'اینترنتی', i: Smartphone },
  { v: 'credit', l: 'اعتباری', i: Wallet },
];

const locked = (order: Order) => order.status === 'delivered' || order.status === 'cancelled';

// کنترل‌های پرداخت که در تمام مدال‌های تغییر وضعیت سفارش (پنل مدیر و
// صندوق‌دار) یکسان نمایش داده می‌شوند: ۴ روش اصلی + «سایر»، تیک «پرداخت
// شد»، و در صورت انتخاب اعتباری، پیش‌نمایش اعتبار فعلی/خرید جدید/اعتبار
// جدید (این پیش‌نمایش فقط نمایشی است — کسر واقعی از حساب فقط در لحظه
// تحویل سفارش انجام می‌شود).
export default function OrderPaymentPanel({ order }: { order: Order }) {
  const updateOrderPayment = useAppStore(s => s.updateOrderPayment);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'cash');
  const [isPaid, setIsPaid] = useState(!!order.isPaid);
  const [saving, setSaving] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [customerHasCredit, setCustomerHasCredit] = useState<boolean | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  const isLocked = locked(order);

  useEffect(() => {
    setPaymentMethod(order.paymentMethod || 'cash');
    setIsPaid(!!order.isPaid);
  }, [order.id, order.paymentMethod, order.isPaid]);

  useEffect(() => {
    let active = true;
    if (!order.customerPhone) { setCustomerHasCredit(false); return; }
    setCustomerLoading(true);
    customerApi.lookup(order.customerPhone)
      .then(c => { if (active) { setCustomerHasCredit(!!c.creditEnabled); setCustomerBalance(c.creditBalance); } })
      .catch(() => { if (active) { setCustomerHasCredit(false); setCustomerBalance(null); } })
      .finally(() => { if (active) setCustomerLoading(false); });
    return () => { active = false; };
  }, [order.customerPhone]);

  const persist = async (next: { paymentMethod?: PaymentMethod; isPaid?: boolean }) => {
    if (isLocked) return;
    const nextMethod = next.paymentMethod ?? paymentMethod;
    const merged = {
      paymentMethod: nextMethod,
      isPaid: next.isPaid ?? isPaid,
      paidByCredit: nextMethod === 'credit',
    };
    setSaving(true);
    try {
      await updateOrderPayment(order.id, merged);
      setPaymentMethod(merged.paymentMethod);
      setIsPaid(merged.isPaid);
      toast.success('وضعیت پرداخت بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'بروزرسانی پرداخت با خطا مواجه شد');
    } finally {
      setSaving(false);
    }
  };

  // اعتبار فعلی / خرید جدید / اعتبار جدید — تا قبل از تحویل فقط نمایشی
  // است (بر پایه مانده فعلی حساب که هنوز کسر نشده)، همان مقداری که پس از
  // تحویل واقعاً از حساب کسر خواهد شد.
  const creditPreview = customerBalance !== null ? {
    current: customerBalance,
    purchase: order.total,
    next: customerBalance - order.total,
  } : null;

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3">
      <p className="text-xs text-zinc-400">وضعیت پرداخت</p>

      {isLocked && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          این سفارش {order.status === 'delivered' ? 'تحویل داده شده' : 'لغو شده'} است — امکان تغییر روش پرداخت یا مبالغ وجود ندارد.
        </p>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {mainMethods.map(m => {
          const disabled = saving || isLocked || (m.v === 'credit' && (customerLoading || !customerHasCredit));
          return (
            <button
              key={m.v}
              disabled={disabled}
              onClick={() => persist({ paymentMethod: m.v })}
              title={m.v === 'credit' && !customerLoading && !customerHasCredit ? 'این مشتری قابلیت پرداخت اعتباری ندارد' : undefined}
              className={cn(
                'py-2 rounded-lg border-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all',
                paymentMethod === m.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500',
                disabled && 'opacity-40 cursor-not-allowed',
                m.v === 'credit' && customerLoading && 'animate-pulse'
              )}
            >
              <m.i className="w-3.5 h-3.5" />{m.l}
            </button>
          );
        })}
        {/* گزینه کوچک‌تر «سایر» — کنار ۴ گزینه اصلی، نه در ردیف جدا */}
        <button
          disabled={saving || isLocked}
          onClick={() => persist({ paymentMethod: 'other' })}
          className={cn(
            'py-2 rounded-lg border flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all',
            paymentMethod === 'other' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400',
            (saving || isLocked) && 'opacity-40 cursor-not-allowed'
          )}
        >
          <MoreHorizontal className="w-3 h-3" />سایر
        </button>
      </div>

      {paymentMethod === 'credit' && (
        customerLoading ? (
          <div className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-700/50 animate-pulse" />
        ) : creditPreview && (
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-zinc-400">اعتبار فعلی</span><span className={creditPreview.current < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(creditPreview.current))}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">خرید جدید</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{formatPrice(creditPreview.purchase)}</span></div>
            <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1"><span className="text-zinc-400">اعتبار جدید</span><span className={creditPreview.next < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(creditPreview.next))}</span></div>
            {!isLocked && <p className="text-zinc-400 pt-1">این تغییر تنها هنگام تحویل سفارش در حساب مشتری اعمال می‌شود.</p>}
          </div>
        )
      )}

      <label className={cn('flex items-center gap-2', isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
        <input type="checkbox" disabled={saving || isLocked} checked={isPaid} onChange={e => persist({ isPaid: e.target.checked })} className="w-4 h-4 rounded" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">پرداخت شد</span>
      </label>
      {!isPaid && !isLocked && (
        <p className="text-xs text-zinc-400">تا این تیک زده نشود، امکان تحویل سفارش وجود نخواهد داشت.</p>
      )}
    </div>
  );
}
