import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Wallet, Banknote, CreditCard, MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { customerApi } from '@/lib/api';
import type { Order, PaymentMethod } from '@/types';

const methods: { v: PaymentMethod; l: string; i: any }[] = [
  { v: 'cash', l: 'نقدی', i: Banknote },
  { v: 'card', l: 'کارت', i: CreditCard },
  { v: 'other', l: 'سایر', i: MoreHorizontal },
];

// کنترل‌های پرداخت که در تمام مدال‌های تغییر وضعیت سفارش (پنل مدیر و
// صندوق‌دار) یکسان نمایش داده می‌شوند: دراپ‌داون روش پرداخت، تیک
// «پرداخت شد»، و تیک «پرداخت اعتباری».
export default function OrderPaymentPanel({ order }: { order: Order }) {
  const updateOrderPayment = useAppStore(s => s.updateOrderPayment);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod || 'cash');
  const [isPaid, setIsPaid] = useState(!!order.isPaid);
  const [paidByCredit, setPaidByCredit] = useState(!!order.paidByCredit);
  const [saving, setSaving] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [customerHasCredit, setCustomerHasCredit] = useState<boolean | null>(null);

  useEffect(() => {
    setPaymentMethod(order.paymentMethod || 'cash');
    setIsPaid(!!order.isPaid);
    setPaidByCredit(!!order.paidByCredit);
  }, [order.id, order.paymentMethod, order.isPaid, order.paidByCredit]);

  useEffect(() => {
    let active = true;
    if (!order.customerPhone) { setCustomerHasCredit(null); return; }
    customerApi.lookup(order.customerPhone)
      .then(c => { if (active) { setCustomerHasCredit(!!c.creditEnabled); setCustomerBalance(c.creditBalance); } })
      .catch(() => { if (active) { setCustomerHasCredit(false); setCustomerBalance(null); } });
    return () => { active = false; };
  }, [order.customerPhone]);

  const persist = async (next: { paymentMethod?: PaymentMethod; isPaid?: boolean; paidByCredit?: boolean }) => {
    const merged = {
      paymentMethod: next.paymentMethod ?? paymentMethod,
      isPaid: next.isPaid ?? isPaid,
      paidByCredit: next.paidByCredit ?? paidByCredit,
    };
    setSaving(true);
    try {
      await updateOrderPayment(order.id, merged);
      setPaymentMethod(merged.paymentMethod);
      setIsPaid(merged.isPaid);
      setPaidByCredit(merged.paidByCredit);
      toast.success('وضعیت پرداخت بروزرسانی شد');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'بروزرسانی پرداخت با خطا مواجه شد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-3">
      <p className="text-xs text-zinc-400">وضعیت پرداخت</p>

      <div className="flex gap-2">
        {methods.map(m => (
          <button
            key={m.v}
            disabled={saving}
            onClick={() => persist({ paymentMethod: m.v })}
            className={cn(
              'flex-1 py-2 rounded-lg border-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all',
              paymentMethod === m.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
            )}
          >
            <m.i className="w-3.5 h-3.5" />{m.l}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" disabled={saving} checked={isPaid} onChange={e => persist({ isPaid: e.target.checked })} className="w-4 h-4 rounded" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />پرداخت شد
        </span>
      </label>

      {customerHasCredit && (
        <>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              disabled={saving || paidByCredit /* already charged — don't allow re-charging by re-toggling */}
              checked={paidByCredit}
              onChange={e => persist({ paidByCredit: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />پرداخت اعتباری
            </span>
          </label>
          {customerBalance !== null && (
            <p className="text-xs text-zinc-400">
              {customerBalance < 0 ? 'بدهی فعلی مشتری: ' : 'اعتبار فعلی مشتری: '}
              <span className={customerBalance < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(customerBalance))}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
