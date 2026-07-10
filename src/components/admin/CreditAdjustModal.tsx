import { useState } from 'react';
import { toast } from 'sonner';
import { Wallet } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/store';
import type { Customer, CreditAdjustKind } from '@/types';

interface CreditAdjustModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onAdjust: (kind: CreditAdjustKind, amount: number) => Promise<void>;
}

// شماره ۱: تغییر مقدار بدهی — used both from "مدیریت مشتری‌ها" (admin) and
// the cashier's "مدیریت حساب اعتباری" modal, with identical fields/logic
// as requested: افزایش اعتبار، خرید جدید، تسویه کامل بدهی.
export default function CreditAdjustModal({ open, onClose, customer, onAdjust }: CreditAdjustModalProps) {
  const [kind, setKind] = useState<CreditAdjustKind>('increase');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setKind('increase'); setAmount(''); };

  const handleSubmit = async () => {
    if (kind !== 'settle') {
      const value = Number(amount);
      if (!amount || Number.isNaN(value) || value <= 0) {
        toast.error('مبلغ معتبر وارد کنید');
        return;
      }
    }
    setSaving(true);
    try {
      await onAdjust(kind, Number(amount) || 0);
      toast.success('حساب اعتباری بروزرسانی شد');
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در بروزرسانی حساب اعتباری');
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;
  const debt = customer.creditBalance < 0;

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="تغییر مقدار بدهی"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>انصراف</Button>
          <Button onClick={handleSubmit} loading={saving}>ثبت</Button>
        </div>
      }
    >
      <div className="p-6 space-y-5">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="font-bold text-zinc-900 dark:text-zinc-100">{customer.firstName} {customer.lastName}</p>
            <p className="text-xs text-zinc-400 font-mono" dir="ltr">{customer.phone}</p>
          </div>
          <div className="mr-auto text-left">
            <p className="text-xs text-zinc-400">{debt ? 'بدهی' : 'اعتبار'}</p>
            <p className={debt ? 'font-black text-red-600' : 'font-black text-emerald-600'}>
              {formatPrice(Math.abs(customer.creditBalance))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'increase', l: 'افزایش اعتبار' },
            { v: 'purchase', l: 'خرید جدید' },
            { v: 'settle', l: 'تسویه کامل بدهی' },
          ] as { v: CreditAdjustKind; l: string }[]).map(opt => (
            <button
              key={opt.v}
              onClick={() => setKind(opt.v)}
              className={
                'py-2.5 rounded-xl border-2 text-xs font-bold transition-all ' +
                (kind === opt.v
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')
              }
            >
              {opt.l}
            </button>
          ))}
        </div>

        {kind !== 'settle' && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">مبلغ (تومان)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="مبلغ را وارد کنید"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        )}
        {kind === 'settle' && (
          <p className="text-sm text-zinc-500">با تأیید، حساب اعتباری این مشتری صفر می‌شود.</p>
        )}
      </div>
    </Modal>
  );
}
