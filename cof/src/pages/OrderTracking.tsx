import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Search, ArrowRight, Clock, Package, CheckCircle2, ChefHat, Coffee } from 'lucide-react';
import { useAppStore, formatPrice } from '@/store';
import { formatJalaliDateTime, fromNowFa } from '@/utils/jalali';
import { iranianMobileError } from '@/utils/phone';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Banner from '@/components/ui/Banner';
import Modal from '@/components/ui/Modal';
import type { Order, OrderStatus } from '@/types';
import QRCode from 'react-qr-code';

const statusSteps: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
  { key: 'pending',   label: 'در انتظار تایید',   icon: Clock },
  { key: 'preparing', label: 'در حال آماده‌سازی', icon: ChefHat },
  { key: 'ready',     label: 'آماده تحویل',        icon: Package },
  { key: 'delivered', label: 'تحویل داده شد',      icon: CheckCircle2 },
];

const badgeVariant: Record<OrderStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning', preparing: 'info', ready: 'success', delivered: 'success', cancelled: 'danger',
};

function estimatedCompletion(order: Order): string {
  if (order.status === 'delivered') return 'تحویل داده شده';
  if (order.status === 'cancelled') return '—';
  const perItem = 4;
  const count = order.items?.reduce((s, i) => s + i.quantity, 0) || 1;
  const mins = Math.max(10, Math.min(35, count * perItem));
  const eta = new Date(new Date(order.createdAt).getTime() + mins * 60000);
  const rel = fromNowFa(eta);
  return rel.includes('پیش') ? 'به‌زودی' : rel;
}

export default function OrderTracking() {
  const menuUrl   = `${window.location.origin}/`;
  const trackOrder = useAppStore(s => s.trackOrder);
  const [trackingCode, setTrackingCode] = useState('');
  const [phone,        setPhone]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [order,        setOrder]        = useState<Order | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);

  const phoneErr = phone ? iranianMobileError(phone) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = trackingCode.trim();
    if (!code) { setError('کد پیگیری را وارد کنید'); return; }
    const pErr = iranianMobileError(phone, true);
    if (pErr) { setError(pErr); return; }
    setLoading(true);
    try {
      const result = await trackOrder(code, phone);
      if (!result) { setError('سفارشی با این کد پیگیری و شماره تماس یافت نشد'); return; }
      setOrder(result);
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const stepIdx = order ? statusSteps.findIndex(s => s.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-brand-600 transition-colors mb-6">
          <ArrowRight className="w-4 h-4" />بازگشت به منو
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl flex items-center justify-center shadow-lg">
            <Coffee className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">پیگیری سفارش</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">کد پیگیری و شماره تماس خود را وارد کنید</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-sm">
          <Input label="کد پیگیری" placeholder="مثال: A7K9XQ21" value={trackingCode}
            onChange={e => setTrackingCode(e.target.value.toUpperCase())} className="font-mono tracking-widest text-center" dir="ltr" />
          <Input label="شماره تماس" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={phone}
            onChange={e => setPhone(e.target.value)} error={phoneErr || undefined} />
          {error && <Banner variant="danger">{error}</Banner>}
          <Button type="submit" className="w-full !py-3" loading={loading} icon={<Search className="w-4 h-4" />}>
            پیگیری سفارش
          </Button>
        </form>

        <div className="mt-8 mx-auto p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 flex flex-col w-fit items-center">
          <QRCode value={menuUrl} size={220} level="H" fgColor="#991b1b" />
          <p className="mt-4 text-xs text-zinc-400 font-mono break-all max-w-[300px]" dir="ltr">{menuUrl}</p>
        </div>
      </div>

      {/* Result Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="جزئیات سفارش" size="md">
        {order && (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">شماره سفارش</p>
                <p className="font-mono font-black text-lg text-zinc-900 dark:text-zinc-100" dir="ltr">
                  #{order.orderNumber.replace('COOL-', '')}
                </p>
              </div>
              {order.status === 'cancelled' ? (
                <Badge variant="danger">لغو شده</Badge>
              ) : (
                <Badge variant={badgeVariant[order.status]} dot>
                  {statusSteps.find(s => s.key === order.status)?.label ?? order.status}
                </Badge>
              )}
            </div>

            {/* Status stepper */}
            {order.status !== 'cancelled' && (
              <div className="flex items-center justify-between px-1">
                {statusSteps.map((step, i) => {
                  const reached = i <= stepIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center text-center relative">
                      {i > 0 && (
                        <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${i <= stepIdx ? 'bg-brand-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${reached ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className={`text-[10px] mt-1.5 font-medium leading-tight ${reached ? 'text-brand-700 dark:text-brand-400' : 'text-zinc-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-400">زمان ثبت</p>
                <p className="font-bold text-sm mt-0.5">{formatJalaliDateTime(order.createdAt)}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-xs text-zinc-400">زمان تقریبی آماده‌سازی</p>
                <p className="font-bold text-sm mt-0.5">{estimatedCompletion(order)}</p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">اقلام سفارش</p>
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <span className="text-sm"><span className="font-bold">{item.quantity}×</span> {item.name}</span>
                  <span className="font-bold text-sm">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t-2 border-dashed border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
              <span className="font-bold">مبلغ نهایی</span>
              <span className="text-xl font-black text-brand-600">{formatPrice(order.total)}</span>
            </div>

            {/* Re-search button */}
            <Button variant="outline" className="w-full" onClick={() => { setModalOpen(false); setOrder(null); setTrackingCode(''); setPhone(''); }}>
              جستجوی سفارش دیگر
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
