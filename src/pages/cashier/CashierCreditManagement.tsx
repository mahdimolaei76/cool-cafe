import { useState } from 'react';
import { toast } from 'sonner';
import { Search, Wallet, Phone, User } from 'lucide-react';
import { formatPrice } from '@/store';
import { customerApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Banner from '@/components/ui/Banner';
import CreditAdjustModal from '@/components/admin/CreditAdjustModal';
import { iranianMobileError, normalizeIranianMobile } from '@/utils/phone';
import type { Customer, CreditAdjustKind } from '@/types';

// مدیریت حساب اعتباری — همان مدال «تغییر مقدار بدهی» پنل مدیر، اما با
// جستجوی مستقیم بر اساس شماره تلفن، برای استفاده صندوق‌دار.
export default function CashierCreditManagement() {
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearch = async () => {
    const err = iranianMobileError(phone, true);
    if (err) { toast.error(err); return; }
    setSearching(true);
    setNotFound(false);
    setCustomer(null);
    try {
      const found = await customerApi.lookup(normalizeIranianMobile(phone));
      setCustomer(found);
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const handleAdjust = async (kind: CreditAdjustKind, amount: number) => {
    if (!customer) return;
    const updated = await customerApi.adjustCredit(customer.id, kind, amount);
    setCustomer(updated);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">مدیریت حساب اعتباری</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">با وارد کردن شماره تلفن، حساب اعتباری مشتری را مشاهده و تغییر دهید</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          icon={<Phone className="w-4 h-4" />}
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          className="flex-1"
        />
        <Button onClick={handleSearch} loading={searching} icon={<Search className="w-4 h-4" />}>جستجو</Button>
      </div>

      {notFound && (
        <Banner variant="warning">مشتری‌ای با این شماره تلفن یافت نشد.</Banner>
      )}

      {customer && !customer.creditEnabled && (
        <Banner variant="warning">این مشتری قابلیت پرداخت اعتباری ندارد.</Banner>
      )}

      {customer && customer.creditEnabled && (
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">{customer.firstName} {customer.lastName}</p>
              <p className="text-xs text-zinc-400 font-mono" dir="ltr">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <span className="text-sm text-zinc-500">{customer.creditBalance < 0 ? 'بدهی' : 'اعتبار'}</span>
            <span className={customer.creditBalance < 0 ? 'text-xl font-black text-red-600' : 'text-xl font-black text-emerald-600'}>
              {formatPrice(Math.abs(customer.creditBalance))}
            </span>
          </div>
          <Button className="w-full" icon={<Wallet className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
            تغییر مقدار بدهی
          </Button>
        </div>
      )}

      <CreditAdjustModal open={modalOpen} onClose={() => setModalOpen(false)} customer={customer} onAdjust={handleAdjust} />
    </div>
  );
}
