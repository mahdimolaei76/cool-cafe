import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, Search, Check, ShoppingCart, User, CreditCard, Banknote, Smartphone, Receipt, Flame, Zap, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice, formatItemPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { uuidGenerator, customerApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import Banner from '@/components/ui/Banner';
import ScrollRow from '@/components/ui/ScrollRow';
import type { Order, OrderType, PaymentMethod, MenuItem } from '@/types';
import { iranianMobileError } from '@/utils/phone';
import { formatJalaliDateTime } from '@/utils/jalali';

const paymentMethodLabels: Record<PaymentMethod, string> = { cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر' };
const paymentMethodIcons: Record<PaymentMethod, any> = { cash: Banknote, card: CreditCard, online: Smartphone, credit: Wallet, other: Receipt };

interface CartEntry {
  menuItem: MenuItem;
  quantity: number;
  /** Cashier-entered price for a single unit of a 'variable' priced item.
   * null until the cashier fills it in; the line contributes 0 to the
   * order total until then, same as the customer-facing flow. */
  manualPrice: number | null;
}

export default function NewOrder() {
  const { menuItems: rawMenuItems, categories: rawCategories, orders: rawOrders, addOrder, settings } = useAppStore();
  const menuItems = rawMenuItems ?? [];
  const categories = rawCategories ?? [];
  const orders = rawOrders ?? [];
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [success, setSuccess] = useState<Order | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ firstName: '', lastName: '', phone: '', notes: '' });
  const openCustomerModal = () => {
    setCustomerDraft({ firstName: form.firstName, lastName: form.lastName, phone: form.phone, notes: form.notes });
    setCustomerModal(true);
  };
  const confirmCustomerModal = () => {
    setForm(p => ({ ...p, ...customerDraft }));
    setCustomerModal(false);
  };
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', notes: '', discount: 0, orderType: 'in-person' as OrderType, paymentMethod: 'cash' as PaymentMethod });

  const activeCategories = categories?.filter(c => c.isActive).sort((a, b) => a.order - b.order);

  // Top 6 best sellers
  const topSellingItems = useMemo(() => {
    const salesCount: Record<string, number> = {};
    orders.forEach(o => { if (o.status !== 'cancelled') o.items.forEach(item => { salesCount[item.menuItemId] = (salesCount[item.menuItemId] || 0) + item.quantity; }); });
    return Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 6)?.map(([id]) => menuItems.find(m => m.id === id))?.filter(Boolean) as MenuItem[];
  }, [orders, menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems.filter(m => m.isAvailable);
    if (selectedCategory !== 'all') items = items.filter(i => i.categoryId === selectedCategory);
    if (search) { const q = search.toLowerCase(); items = items.filter(m => m.name.toLowerCase().includes(q)); }
    return items;
  }, [menuItems, selectedCategory, search]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id);
      if (ex) return prev?.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1, manualPrice: null }];
    });
  };
  const setManualPrice = (id: string, price: number | null) => {
    setCart(prev => prev?.map(c => c.menuItem.id === id ? { ...c, manualPrice: price } : c));
  };
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev?.filter(c => c.menuItem.id !== id));
    else setCart(prev => prev?.map(c => c.menuItem.id === id ? { ...c, quantity: qty } : c));
  };

  const lineTotal = (c: CartEntry) => c.menuItem.priceType === 'variable' ? (c.manualPrice ?? 0) * c.quantity : c.menuItem.price * c.quantity;
  const subtotal = cart.reduce((s, c) => s + lineTotal(c), 0);
  const total = Math.max(0, subtotal - form.discount);
  const hasUnpricedVariableItems = cart.some(c => c.menuItem.priceType === 'variable' && (c.manualPrice === null || c.manualPrice === undefined));
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── مودال پرداخت (گزینه پرداخت) ──
  // ۴ روش اصلی + سایر، تیک «پرداخت در مراحل بعد» که اجازه می‌دهد سفارش
  // بدون انتخاب روش پرداخت ثبت شود (تصمیم‌گیری در مراحل بعد/مودال تغییر
  // وضعیت). اعتباری فقط وقتی مشتری این قابلیت را فعال داشته باشد قابل
  // انتخاب است؛ در این حالت پیش‌نمایش اعتبار فعلی/خرید جدید/اعتبار جدید
  // نمایش داده می‌شود (اعمال واقعی روی حساب فقط هنگام تحویل انجام می‌شود).
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  // مقدار تایید شده (نمایش داده می‌شود و در سفارش ثبت می‌شود)
  const [confirmedPaymentMethod, setConfirmedPaymentMethod] = useState<PaymentMethod | null>('cash');
  const [confirmedDefer, setConfirmedDefer] = useState(false);
  // مقدار موقت داخل مودال — تا «تأیید» زده نشود چیزی commit نمی‌شود، پس
  // زدن «انصراف» هیچ تغییری در انتخاب فعلی سفارش ایجاد نمی‌کند.
  const [draftPaymentMethod, setDraftPaymentMethod] = useState<PaymentMethod | null>('cash');
  const [draftDefer, setDraftDefer] = useState(false);
  const [creditCustomer, setCreditCustomer] = useState<{ firstName: string; lastName: string; creditEnabled: boolean; creditBalance: number } | null>(null);
  const [creditChecking, setCreditChecking] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  const paidByCredit = confirmedPaymentMethod === 'credit';
  const isPaid = !confirmedDefer && !!confirmedPaymentMethod;

  const openPaymentModal = async () => {
    setDraftPaymentMethod(confirmedPaymentMethod);
    setDraftDefer(confirmedDefer);
    setCreditError(null);
    setPaymentModalOpen(true);
    const phoneErr = iranianMobileError(form.phone, true);
    if (phoneErr) { setCreditCustomer(null); return; }
    setCreditChecking(true);
    try {
      const customer = await customerApi.lookup(form.phone);
      setCreditCustomer(customer);
    } catch {
      setCreditCustomer(null);
    } finally {
      setCreditChecking(false);
    }
  };

  const choosePaymentMethod = (m: PaymentMethod) => {
    if (m === 'credit' && !creditCustomer?.creditEnabled) {
      setCreditError('این مشتری قابلیت پرداخت اعتباری ندارد');
      return;
    }
    setCreditError(null);
    setDraftPaymentMethod(m);
    setDraftDefer(false);
  };

  const confirmPaymentModal = () => {
    if (!draftDefer && !draftPaymentMethod) {
      toast.error('یک روش پرداخت انتخاب کنید یا «پرداخت در مراحل بعد» را بزنید');
      return;
    }
    setConfirmedPaymentMethod(draftPaymentMethod);
    setConfirmedDefer(draftDefer);
    setForm(p => ({ ...p, paymentMethod: draftPaymentMethod || 'cash' }));
    setPaymentModalOpen(false);
  };

  const handleSubmit = async () => {
    if (cart?.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[Order] submit blocked: cart is empty');
      toast.error('سبد خرید خالی است — ابتدا محصولی اضافه کنید');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      // eslint-disable-next-line no-console
      console.info('[Order] submitting to backend…', { base: import.meta.env.VITE_API_URL || '/api', itemCount: cart?.length });
      const order = await addOrder({
        customerFirstName: form.firstName || 'مشتری', customerLastName: form.lastName || 'حضوری', customerPhone: form.phone,
        items: cart?.map(c => {
          const isVariable = c.menuItem.priceType === 'variable';
          const unitPrice = isVariable ? (c.manualPrice ?? 0) : c.menuItem.price;
          return {
            id: uuidGenerator(), menuItemId: c.menuItem.id, menuItem: c.menuItem, name: c.menuItem.name,
            price: unitPrice, quantity: c.quantity, subtotal: unitPrice * c.quantity,
            isPriceVariable: isVariable,
            priceConfirmed: isVariable ? c.manualPrice !== null && c.manualPrice !== undefined : true,
            priceLabel: isVariable && (c.manualPrice === null || c.manualPrice === undefined) ? (c.menuItem.priceLabel || 'قیمت‌گذاری نشده') : undefined,
          };
        }),
        subtotal, discount: form.discount, total, notes: form.notes, status: 'pending', orderType: form.orderType, paymentMethod: form.paymentMethod, paidByCredit, isPaid, cashier: user?.name || '',
      });
      setSuccess(order);
      toast.success('سفارش با موفقیت ثبت شد');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Order] addOrder threw:', err);
      // The backend genuinely could not be reached. addOrder still keeps
      // the order on this device (attached to the error) so the cashier
      // doesn't lose the work, but it must NOT be reported as a normal
      // success — the kitchen and other devices won't see it until it's
      // synced, so we say so clearly instead of hiding the failure.
      const orderErr = err as Error & { order?: Order };
      const message = err instanceof Error ? err.message : 'ثبت سفارش با خطا مواجه شد. دوباره تلاش کنید.';
      if (orderErr?.order) {
        setSuccess(orderErr.order);
        toast.warning('سفارش روی این دستگاه ذخیره شد، اما به سرور ارسال نشد. اتصال اینترنت/سرور را بررسی کنید.', { duration: 6000 });
      } else {
        setSubmitError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };
  const resetOrder = () => {
    setCart([]);
    setForm({ firstName: '', lastName: '', phone: '', notes: '', discount: 0, orderType: 'in-person', paymentMethod: 'cash' });
    setSuccess(null);
    setConfirmedPaymentMethod('cash');
    setConfirmedDefer(false);
    setDraftPaymentMethod('cash');
    setDraftDefer(false);
    setCreditCustomer(null);
    setCreditError(null);
    setCustomerDraft({ firstName: '', lastName: '', phone: '', notes: '' });
  };

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm mx-auto print:hidden">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="w-24 h-24 mx-auto mb-6 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </motion.div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100">ثبت شد!</h2>
          <div className="mt-6 p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-700">
            <p className="text-xs text-zinc-400 mb-1">شماره سفارش</p>
            <p className="text-4xl font-black text-brand-600 font-mono" dir="ltr">{success.orderNumber}</p>
          </div>
          <p className="mt-4 text-lg font-bold text-brand-600">{formatPrice(success.total)}</p>
          <div className="flex gap-3 mt-8">
            <Button variant="outline" className="flex-1 !py-3 !rounded-2xl" onClick={() => window.print()}><Receipt className="w-4 h-4 ml-1" />رسید</Button>
            <Button className="flex-1 !py-3 !rounded-2xl !bg-brand-600" onClick={resetOrder}><Plus className="w-4 h-4 ml-1" />سفارش جدید</Button>
          </div>
        </motion.div>

        {/* Printable receipt — hidden on screen, shown only for window.print().
            Previously "رسید" printed this same on-screen success card, which
            only has the order number and total; a real receipt needs the
            line items, customer, and payment info too. */}
        <div className="hidden print:block print-receipt text-black" dir="rtl">
          <div className="max-w-sm mx-auto font-mono text-sm">
            <div className="text-center mb-4">
              <p className="text-lg font-black">{settings.name}</p>
              {settings.address && <p className="text-xs mt-0.5">{settings.address}</p>}
              {settings.phone && <p className="text-xs" dir="ltr">{settings.phone}</p>}
            </div>
            <div className="border-t border-b border-dashed border-black py-2 my-2 space-y-1 text-xs">
              <div className="flex justify-between"><span>شماره سفارش</span><span dir="ltr" className="font-bold">{success.orderNumber}</span></div>
              <div className="flex justify-between"><span>کد پیگیری</span><span dir="ltr">{success.trackingCode}</span></div>
              <div className="flex justify-between"><span>تاریخ</span><span>{formatJalaliDateTime(success.createdAt)}</span></div>
              <div className="flex justify-between"><span>مشتری</span><span>{success.customerFirstName} {success.customerLastName}</span></div>
              {success.customerPhone && <div className="flex justify-between"><span>تلفن</span><span dir="ltr">{success.customerPhone}</span></div>}
              <div className="flex justify-between"><span>نوع سفارش</span><span>{success.orderType === 'online' ? 'آنلاین' : 'حضوری'}</span></div>
              <div className="flex justify-between"><span>پرداخت</span><span>{{ cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر' }[success.paymentMethod]}</span></div>
              <div className="flex justify-between"><span>صندوق‌دار</span><span>{success.cashier || '—'}</span></div>
            </div>
            <div className="space-y-1.5 py-2 border-b border-dashed border-black">
              {success.items?.map(item => (
                <div key={item.id} className="flex justify-between text-xs gap-2">
                  <span className="flex-1">{item.quantity}× {item.name}</span>
                  <span className="flex-shrink-0">
                    {item.isPriceVariable && !item.priceConfirmed
                      ? (item.priceLabel || 'قیمت بازار')
                      : formatPrice(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span>جمع</span><span>{formatPrice(success.subtotal)}</span></div>
              {success.discount > 0 && <div className="flex justify-between"><span>تخفیف</span><span>-{formatPrice(success.discount)}</span></div>}
              <div className="flex justify-between text-base font-black pt-1 border-t border-dashed border-black mt-1"><span>مبلغ نهایی</span><span>{formatPrice(success.total)}</span></div>
            </div>
            <p className="text-center text-xs mt-4">با تشکر از خرید شما 🌸</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-5">
      {/* ── Left: Menu ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top sellers */}
        {topSellingItems?.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-brand-50 to-orange-50 dark:from-brand-900/20 dark:to-orange-900/20 rounded-2xl border border-brand-100 dark:border-brand-800">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-brand-700 dark:text-brand-400">پرفروش‌ها</span>
            </div>
            <ScrollRow trackClassName="gap-2">
              {topSellingItems?.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id);
                return (
                  <button key={item.id} onClick={() => addToCart(item)} className={cn('flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-right border', inCart ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-brand-400')}>
                    <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className={cn('text-xs font-bold', inCart ? 'text-white' : 'text-zinc-900 dark:text-zinc-100')}>{item.name}</p>
                      <p className={cn('text-[10px]', inCart ? 'text-white/70' : 'text-brand-600')}>{formatItemPrice(item)}</p>
                    </div>
                    {inCart && <span className="w-5 h-5 bg-white text-brand-600 rounded-full text-[10px] font-black flex items-center justify-center">{inCart.quantity}</span>}
                  </button>
                );
              })}
            </ScrollRow>
          </div>
        )}

        {/* Categories */}
        <ScrollRow className="mb-4" trackClassName="gap-2">
          <button onClick={() => setSelectedCategory('all')} className={cn('flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2', selectedCategory === 'all' ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700')}>
            همه
          </button>
          {activeCategories?.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn('flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2', selectedCategory === cat.id ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700')}>
              <span className="ml-2 text-lg">{cat.icon}</span>{cat.name}
            </button>
          ))}
        </ScrollRow>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input type="text" placeholder="جستجوی محصول..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base font-medium" />
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <Search className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-400 font-bold">موردی یافت نشد</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">جستجو یا دسته‌بندی را تغییر دهید</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id);
                return (
                  <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)}
                    className={cn('relative p-4 rounded-2xl text-right transition-all', inCart ? 'bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-500 shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:border-brand-400 hover:shadow-lg')}>
                    <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-100 dark:bg-zinc-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base truncate">{item.name}</h3>
                    <p className="text-brand-600 dark:text-brand-400 font-black text-lg mt-1">{formatItemPrice(item)}</p>
                    {inCart && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -left-2 w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center text-base font-black shadow-lg shadow-brand-500/40">{inCart.quantity}</motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="w-[420px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl">
        <div className="p-5 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
              <div><h3 className="font-black text-xl">سفارش جاری</h3><p className="text-white/70 text-sm">{itemCount} آیتم</p></div>
            </div>
            {cart?.length > 0 && <button onClick={() => setCart([])} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {cart?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <ShoppingCart className="w-16 h-16 text-zinc-200 dark:text-zinc-700 mb-3" />
                <p className="text-zinc-400 font-bold">سبد خرید خالی</p>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">محصولات رو از سمت چپ انتخاب کنید</p>
              </div>
            ) : cart?.map(c => (
              <motion.div key={c.menuItem.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <img src={c.menuItem.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{c.menuItem.name}</h4>
                  {c.menuItem.priceType === 'variable' ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex-shrink-0">
                        {c.menuItem.priceLabel || 'قیمت بازار'} —
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="قیمت واحد (تومان)"
                        value={c.manualPrice ?? ''}
                        onChange={e => setManualPrice(c.menuItem.id, e.target.value === '' ? null : Number(e.target.value))}
                        className="w-32 px-2 py-1 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 mt-0.5">{formatPrice(c.menuItem.price)}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-700 rounded-xl p-1 border border-zinc-200 dark:border-zinc-600">
                      <button onClick={() => updateQty(c.menuItem.id, c.quantity - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        {c.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-8 text-center font-black text-lg">{c.quantity}</span>
                      <button onClick={() => updateQty(c.menuItem.id, c.quantity + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 transition-colors"><Plus className="w-4 h-4" /></button>
                    </div>
                    <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
                      {c.menuItem.priceType === 'variable' && c.manualPrice === null ? '—' : formatPrice(lineTotal(c))}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {cart?.length > 0 && (
          <div className="flex-shrink-0 border-t-2 border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
            <div className="flex gap-2">
              {[{ v: 'in-person', l: 'حضوری', i: User }, { v: 'online', l: 'آنلاین', i: Smartphone }]?.map(t => (
                <button key={t.v} onClick={() => setForm(p => ({ ...p, orderType: t.v as OrderType }))} className={cn('flex-1 py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all', form.orderType === t.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500')}>
                  <t.i className="w-4 h-4" />{t.l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={openCustomerModal} className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:border-brand-400 transition-colors flex items-center justify-center gap-2">
                <User className="w-4 h-4" />{form.firstName ? `${form.firstName} ${form.lastName}` : 'مشتری'}
              </button>
              <input type="number" placeholder="تخفیف" value={form.discount || ''} onChange={e => setForm(p => ({ ...p, discount: parseInt(e.target.value) || 0 }))} className="w-28 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-center text-sm font-bold placeholder:text-zinc-400 focus:outline-none focus:border-brand-500" />
            </div>

            {/* گزینه پرداخت — باز کردن مودال انتخاب روش پرداخت */}
            <button
              onClick={openPaymentModal}
              className={cn(
                'w-full py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all',
                confirmedPaymentMethod && !confirmedDefer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : confirmedDefer ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
              )}
            >
              <Wallet className="w-4 h-4" />
              {confirmedDefer ? 'پرداخت در مراحل بعد' : confirmedPaymentMethod ? `روش پرداخت: ${paymentMethodLabels[confirmedPaymentMethod]}` : 'گزینه پرداخت'}
              {confirmedPaymentMethod && !confirmedDefer && <Check className="w-4 h-4" />}
            </button>
            {paidByCredit && creditCustomer && (
              <div className="text-xs text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl py-2">
                {creditCustomer.firstName} {creditCustomer.lastName} — {creditCustomer.creditBalance < 0 ? 'بدهی فعلی: ' : 'اعتبار فعلی: '}
                <span className={creditCustomer.creditBalance < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(creditCustomer.creditBalance))}</span>
              </div>
            )}
          </div>
        )}

        {cart?.length > 0 && (
          <div className="flex-shrink-0 p-5 bg-zinc-50 dark:bg-zinc-800/50 border-t-2 border-zinc-100 dark:border-zinc-800 space-y-3">
            {submitError && <Banner variant="danger">{submitError}</Banner>}
            {hasUnpricedVariableItems && (
              <Banner variant="warning">
                یک یا چند قلم بدون قیمت است — این سفارش ثبت می‌شود اما مبلغ نهایی این اقلام باید جداگانه هنگام تحویل مشخص شود.
              </Banner>
            )}
            <div className="flex items-center justify-between">
              {form.discount > 0 && <p className="text-xs text-emerald-600">تخفیف: -{formatPrice(form.discount)}</p>}
              <p className="text-2xl font-black text-brand-600 mr-auto">{formatPrice(total)}</p>
            </div>
            <Button className="w-full !py-5 !text-lg !font-black !rounded-2xl !bg-brand-600 hover:!bg-brand-700 !shadow-xl !shadow-brand-500/30" onClick={handleSubmit} loading={submitting}>
              <Zap className="w-6 h-6 ml-2" />ثبت سفارش
            </Button>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <Modal open={customerModal} onClose={() => setCustomerModal(false)} title="اطلاعات مشتری" footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCustomerModal(false)}>انصراف</Button>
          <Button onClick={confirmCustomerModal}>تأیید</Button>
        </div>
      }>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="نام" placeholder="نام" value={customerDraft.firstName} onChange={e => setCustomerDraft(p => ({ ...p, firstName: e.target.value }))} />
            <Input label="نام خانوادگی" placeholder="نام خانوادگی" value={customerDraft.lastName} onChange={e => setCustomerDraft(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input
            label="شماره تماس"
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            value={customerDraft.phone}
            onChange={e => setCustomerDraft(p => ({ ...p, phone: e.target.value }))}
            error={iranianMobileError(customerDraft.phone) || undefined}
          />
          <Textarea label="یادداشت" placeholder="توضیحات سفارش..." value={customerDraft.notes} onChange={e => setCustomerDraft(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>
      {/* Payment Modal — گزینه پرداخت */}
      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="روش پرداخت" footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>انصراف</Button>
          <Button onClick={confirmPaymentModal}>تأیید</Button>
        </div>
      }>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-5 gap-1.5">
            {(['cash', 'card', 'online', 'credit'] as PaymentMethod[]).map(m => {
              const Icon = paymentMethodIcons[m];
              const disabled = m === 'credit' && (creditChecking || !creditCustomer?.creditEnabled);
              return (
                <button
                  key={m}
                  disabled={disabled}
                  onClick={() => choosePaymentMethod(m)}
                  title={m === 'credit' && !creditChecking && !creditCustomer?.creditEnabled ? 'این مشتری قابلیت پرداخت اعتباری ندارد' : undefined}
                  className={cn(
                    'py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all',
                    draftPaymentMethod === m && !draftDefer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-4 h-4" />{paymentMethodLabels[m]}
                </button>
              );
            })}
            {/* گزینه کوچک‌تر «سایر» — کنار ۴ گزینه اصلی، نه در ردیف جدا */}
            <button
              onClick={() => choosePaymentMethod('other')}
              className={cn(
                'py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all',
                draftPaymentMethod === 'other' && !draftDefer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'
              )}
            >
              سایر
            </button>
          </div>

          {creditError && <p className="text-xs text-red-500 text-center">{creditError}</p>}

          {draftPaymentMethod === 'credit' && !draftDefer && (
            creditChecking ? (
              <div className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-700/50 animate-pulse" />
            ) : creditCustomer && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-zinc-400">اعتبار فعلی</span><span className={creditCustomer.creditBalance < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(creditCustomer.creditBalance))}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">خرید جدید</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{formatPrice(total)}</span></div>
                <div className="flex justify-between border-t border-zinc-100 dark:border-zinc-800 pt-1"><span className="text-zinc-400">اعتبار جدید</span><span className={(creditCustomer.creditBalance - total) < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>{formatPrice(Math.abs(creditCustomer.creditBalance - total))}</span></div>
                <p className="text-zinc-400 pt-1">این تغییر تنها هنگام تحویل سفارش در حساب مشتری اعمال می‌شود.</p>
              </div>
            )
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={draftDefer}
              onChange={e => { setDraftDefer(e.target.checked); if (e.target.checked) setDraftPaymentMethod(null); }}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">پرداخت در مراحل بعد</span>
          </label>
          {draftDefer && (
            <p className="text-xs text-zinc-400">سفارش بدون تعیین روش پرداخت ثبت می‌شود؛ می‌توانید بعداً از مدال تغییر وضعیت سفارش آن را مشخص کنید.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
