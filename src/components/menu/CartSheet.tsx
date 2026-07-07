import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, Minus, Plus, ShoppingBag, ArrowLeft, Trash2, Check, AlertTriangle, Phone, User, MessageSquare } from 'lucide-react';
import { useCartStore, useAppStore, formatPrice } from '@/store';
import { uuidGenerator } from '@/lib/api';
import Button from '@/components/ui/Button';
import Banner from '@/components/ui/Banner';
import { cn } from '@/utils/cn';
import { iranianMobileError } from '@/utils/phone';
import type { Order, OrderType, PaymentMethod } from '@/types';

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'cart' | 'info' | 'success';

export default function CartSheet({ open, onClose }: CartSheetProps) {
  const { items, updateQuantity, removeItem, getTotal, getVariablePriceItems, clearCart } = useCartStore();
  const addOrder = useAppStore(s => s.addOrder);
  const [step, setStep] = useState<Step>('cart');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [unsynced, setUnsynced] = useState(false);
  const [hadVariableItems, setHadVariableItems] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const total = getTotal();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'نام الزامی است';
    const phoneError = iranianMobileError(form.phone, true);
    if (phoneError) e.phone = phoneError;
    setErrors(e);
    return Object.keys(e)?.length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return; // guard against double-submit from a fast double-tap
    if (items?.length === 0) {
      toast.error('سبد خرید شما خالی است');
      return;
    }
    if (!validate()) {
      // eslint-disable-next-line no-console
      console.warn('[Order] validation failed before any request was sent:', errors, form);
      toast.error('لطفاً اطلاعات را کامل و صحیح وارد کنید');
      return;
    }

    setSubmitting(true);
    try {
      // eslint-disable-next-line no-console
      console.info('[Order] submitting to backend…', { base: import.meta.env.VITE_API_URL || '/api' });
      const order = await addOrder({
        customerFirstName: form.firstName,
        customerLastName: form.lastName,
        customerPhone: form.phone,
        items: items?.map(ci => {
          const isVariable = ci.menuItem.priceType === 'variable';
          return {
            id: uuidGenerator(), menuItemId: ci.menuItem.id, menuItem: ci.menuItem,
            name: ci.menuItem.name, price: isVariable ? 0 : ci.menuItem.price, quantity: ci.quantity,
            subtotal: isVariable ? 0 : ci.menuItem.price * ci.quantity,
            isPriceVariable: isVariable,
            priceConfirmed: !isVariable,
            priceLabel: isVariable ? (ci.menuItem.priceLabel || 'قیمت‌گذاری توسط کافه') : undefined,
          };
        }),
        subtotal: total, discount: 0, total, notes: form.notes,
        status: 'pending', orderType: 'online' as OrderType, paymentMethod: 'cash' as PaymentMethod, cashier: '',
      });
      setOrderNumber(order.orderNumber);
      setTrackingCode(order.trackingCode);
      setHadVariableItems(getVariablePriceItems()?.length > 0);
      clearCart();
      setStep('success');
      toast.success('سفارش شما با موفقیت ثبت شد');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Order] addOrder threw:', err);
      // addOrder always keeps the order locally (attached to the error)
      // even when the backend can't be reached, so the customer's cart
      // isn't lost. Treat that as a completed order from their point of
      // view — they still get a tracking code and can check status later
      // — but flag it clearly so staff know it hasn't synced to the
      // server yet and may need manual reconciliation.
      const orderErr = err as Error & { order?: Order };
      if (orderErr?.order) {
        setOrderNumber(orderErr.order.orderNumber);
        setTrackingCode(orderErr.order.trackingCode);
        setUnsynced(true);
        setHadVariableItems(getVariablePriceItems()?.length > 0);
        clearCart();
        setStep('success');
        toast.warning('سفارش شما ذخیره شد، اما اتصال به سرور برقرار نشد. لطفاً به کافه اطلاع دهید.', { duration: 7000 });
      } else {
        const detail = orderErr instanceof Error ? orderErr.message : String(err);
        toast.error(`ثبت سفارش با خطا مواجه شد: ${detail}`, { duration: 7000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setStep('cart'); setForm({ firstName: '', lastName: '', phone: '', notes: '' }); setErrors({}); setUnsynced(false); setHadVariableItems(false); }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 md:right-0 md:top-0 md:left-auto md:w-[440px] bg-white dark:bg-zinc-900 md:rounded-none rounded-t-3xl shadow-2xl flex flex-col max-h-[calc(92vh-env(safe-area-inset-bottom))] md:max-h-full"
          >
            {/* Drag handle (mobile) */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                    {step === 'cart' ? 'سبد خرید' : step === 'info' ? 'اطلاعات شما' : 'ثبت شد!'}
                  </h2>
                  <p className="text-xs text-zinc-400">{items?.length} محصول</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 'cart' && (
                  <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                    {items?.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                          <ShoppingBag className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                        </div>
                        <p className="font-bold text-zinc-500 text-lg">سبد خالیه!</p>
                        <p className="text-zinc-400 text-sm mt-1">از منو چیزی اضافه کن</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items?.map(ci => (
                          <motion.div key={ci.menuItem.id} layout className="flex gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                            <img src={ci.menuItem.image} alt={ci.menuItem.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{ci.menuItem.name}</h4>
                                <button onClick={() => removeItem(ci.menuItem.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              {ci.menuItem.priceType === 'variable' ? (
                                <p className="text-sm text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                  {ci.menuItem.priceLabel || 'قیمت بازار'} · بعداً توسط کافه مشخص می‌شود
                                </p>
                              ) : (
                                <p className="text-sm text-brand-600 font-bold mt-0.5">{formatPrice(ci.menuItem.price)}</p>
                              )}
                              <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                                <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-700 rounded-xl p-1 border border-zinc-200 dark:border-zinc-600 shadow-sm flex-shrink-0">
                                  <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity - 1)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                                    {ci.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-4 h-4" />}
                                  </button>
                                  <span className="w-6 text-center font-black text-sm text-zinc-900 dark:text-zinc-100">{ci.quantity}</span>
                                  <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity + 1)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20 transition-colors">
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                                <span className="font-black text-zinc-900 dark:text-zinc-100 text-base flex-shrink-0">
                                  {ci.menuItem.priceType === 'variable' ? '—' : formatPrice(ci.menuItem.price * ci.quantity)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 'info' && (
                  <motion.div key="info" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">نام *</label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="نام شما" className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500 transition-colors" />
                      </div>
                      {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">نام خانوادگی</label>
                      <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="نام خانوادگی" className="w-full px-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500 transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">شماره تماس *</label>
                      <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="۰۹۱۲۳۴۵۶۷۸۹" className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500 transition-colors" dir="ltr" />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">توضیحات</label>
                      <div className="relative">
                        <MessageSquare className="absolute right-4 top-4 w-5 h-5 text-zinc-400" />
                        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="درخواست ویژه دارید؟" rows={3} className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500 transition-colors resize-none" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-5 py-12 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                      className={cn(
                        'w-24 h-24 mx-auto mb-6 rounded-[2rem] flex items-center justify-center',
                        unsynced ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                      )}
                    >
                      {unsynced
                        ? <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                        : <Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />}
                    </motion.div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                      {unsynced ? 'سفارش ذخیره شد' : 'سفارش ثبت شد!'}
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                      {unsynced ? 'سفارش شما ذخیره شد اما هنوز برای کافه ارسال نشده.' : 'سفارش شما دریافت شد.'}
                    </p>
                    {unsynced && (
                      <div className="mt-4">
                        <Banner variant="warning">
                          اتصال به سرور برقرار نشد. لطفاً کد پیگیری زیر را به کافه نشان دهید تا سفارش شما به‌صورت دستی ثبت شود.
                        </Banner>
                      </div>
                    )}
                    <div className="mt-8 p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                      <p className="text-xs text-zinc-400 mb-1">شماره سفارش</p>
                      <p className="text-3xl font-black text-brand-600 font-mono tracking-wider" dir="ltr">{orderNumber}</p>
                    </div>
                    {trackingCode && (
                      <div className="mt-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl">
                        <p className="text-xs text-brand-700 dark:text-brand-400 mb-1">کد پیگیری</p>
                        <p className="text-xl font-black text-brand-700 dark:text-brand-400 font-mono tracking-widest" dir="ltr">{trackingCode}</p>
                      </div>
                    )}
                    {hadVariableItems && (
                      <div className="mt-3">
                        <Banner variant="warning">
                          مبلغ نهایی این سفارش شامل قیمت اقلامِ «قیمت بازار» نیست — این مبلغ توسط کافه محاسبه و هنگام تحویل به شما اعلام می‌شود.
                        </Banner>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-zinc-400">این کد رو نگه دار برای پیگیری سفارش</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step !== 'success' && items?.length > 0 && (
              <div className="border-t-2 border-zinc-100 dark:border-zinc-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">جمع کل</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formatPrice(total)}</span>
                </div>
                {getVariablePriceItems()?.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2">
                    ⚠️ قیمت {getVariablePriceItems()?.length} قلم در این مبلغ نیست و جداگانه محاسبه می‌شود
                  </p>
                )}
                {step === 'cart' ? (
                  <Button className="w-full !py-4 !text-base !font-bold !rounded-2xl !bg-brand-600 hover:!bg-brand-700 !shadow-xl !shadow-brand-500/25" size="lg" onClick={() => setStep('info')} icon={<ArrowLeft className="w-5 h-5" />}>
                    ادامه و ثبت سفارش
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('cart')} className="flex-1 !py-4 !rounded-2xl !font-bold" disabled={submitting}>بازگشت</Button>
                    <Button className="flex-1 !py-4 !rounded-2xl !font-bold !bg-brand-600 hover:!bg-brand-700" onClick={handleSubmit} loading={submitting}>ثبت سفارش</Button>
                  </div>
                )}
              </div>
            )}

            {step === 'success' && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <Button className="w-full !py-4 !text-base !font-bold !rounded-2xl !bg-brand-600 hover:!bg-brand-700" size="lg" onClick={handleClose}>بستن</Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
