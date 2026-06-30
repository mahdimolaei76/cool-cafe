import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Search, Check, ShoppingCart, User, CreditCard, Banknote, Smartphone, Receipt, Flame, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Modal from '@/components/ui/Modal';
import type { OrderType, PaymentMethod, MenuItem } from '@/types';

interface CartEntry { menuItem: MenuItem; quantity: number; }

export default function NewOrder() {
  const { menuItems, categories, orders, addOrder } = useAppStore();
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', notes: '', discount: 0, orderType: 'in-person' as OrderType, paymentMethod: 'cash' as PaymentMethod });

  const activeCategories = categories.filter(c => c.isActive).sort((a, b) => a.order - b.order);

  // Top 6 best sellers
  const topSellingItems = useMemo(() => {
    const salesCount: Record<string, number> = {};
    orders.forEach(o => { if (o.status !== 'cancelled') o.items.forEach(item => { salesCount[item.menuItemId] = (salesCount[item.menuItemId] || 0) + item.quantity; }); });
    return Object.entries(salesCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => menuItems.find(m => m.id === id))?.filter(Boolean) as MenuItem[];
  }, [orders, menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems?.filter(m => m.isAvailable);
    if (selectedCategory !== 'all') items = items?.filter(i => i.categoryId === selectedCategory);
    if (search) { const q = search.toLowerCase(); items = items.filter(m => m.name.toLowerCase().includes(q)); }
    return items;
  }, [menuItems, selectedCategory, search]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id);
      if (ex) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.menuItem.id !== id));
    else setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, quantity: qty } : c));
  };

  const subtotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const total = Math.max(0, subtotal - form.discount);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const order = await addOrder({
      customerFirstName: form.firstName || 'مشتری', customerLastName: form.lastName || 'حضوری', customerPhone: form.phone,
      items: cart.map(c => ({ id: crypto.randomUUID(), menuItemId: c.menuItem.id, menuItem: c.menuItem, name: c.menuItem.name, price: c.menuItem.price, quantity: c.quantity, subtotal: c.menuItem.price * c.quantity })),
      subtotal, discount: form.discount, total, notes: form.notes, status: 'pending', orderType: form.orderType, paymentMethod: form.paymentMethod, cashier: user?.name || '',
    });
    setSuccess(order.orderNumber);
  };
  const resetOrder = () => { setCart([]); setForm({ firstName: '', lastName: '', phone: '', notes: '', discount: 0, orderType: 'in-person', paymentMethod: 'cash' }); setSuccess(null); };

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="w-24 h-24 mx-auto mb-6 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </motion.div>
          <h2 className="text-3xl font-black text-surface-900 dark:text-surface-100">ثبت شد!</h2>
          <div className="mt-6 p-6 bg-white dark:bg-surface-800 rounded-2xl shadow-lg border border-surface-100 dark:border-surface-700">
            <p className="text-xs text-surface-400 mb-1">شماره سفارش</p>
            <p className="text-4xl font-black text-brand-600 font-mono" dir="ltr">{success}</p>
          </div>
          <p className="mt-4 text-lg font-bold text-brand-600">{formatPrice(total)}</p>
          <div className="flex gap-3 mt-8">
            <Button variant="outline" className="flex-1 !py-3 !rounded-2xl" onClick={() => window.print()}><Receipt className="w-4 h-4 ml-1" />رسید</Button>
            <Button className="flex-1 !py-3 !rounded-2xl !bg-brand-600" onClick={resetOrder}><Plus className="w-4 h-4 ml-1" />سفارش جدید</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex gap-5">
      {/* ── Left: Menu ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top sellers */}
        {topSellingItems.length > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-brand-50 to-orange-50 dark:from-brand-900/20 dark:to-orange-900/20 rounded-2xl border border-brand-100 dark:border-brand-800">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-brand-700 dark:text-brand-400">پرفروش‌ها</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {topSellingItems.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id);
                return (
                  <button key={item.id} onClick={() => addToCart(item)} className={cn('flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-right', inCart ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-brand-400')}>
                    <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <p className={cn('text-xs font-bold', inCart ? 'text-white' : 'text-surface-900 dark:text-surface-100')}>{item.name}</p>
                      <p className={cn('text-[10px]', inCart ? 'text-white/70' : 'text-brand-600')}>{formatPrice(item.price)}</p>
                    </div>
                    {inCart && <span className="w-5 h-5 bg-white text-brand-600 rounded-full text-[10px] font-black flex items-center justify-center">{inCart.quantity}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          <button onClick={() => setSelectedCategory('all')} className={cn('flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all', selectedCategory === 'all' ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-2 border-surface-200 dark:border-surface-700')}>
            همه
          </button>
          {activeCategories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn('flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap', selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-2 border-surface-200 dark:border-surface-700')}>
              <span className="ml-2 text-lg">{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input type="text" placeholder="جستجوی محصول..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-base font-medium" />
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.menuItem.id === item.id);
              return (
                <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)}
                  className={cn('relative p-4 rounded-2xl text-right transition-all', inCart ? 'bg-brand-50 dark:bg-brand-900/30 border-2 border-brand-500 shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-surface-800 border-2 border-surface-200 dark:border-surface-700 hover:border-brand-400 hover:shadow-lg')}>
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-surface-100 dark:bg-surface-700">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-bold text-surface-900 dark:text-surface-100 text-base truncate">{item.name}</h3>
                  <p className="text-brand-600 dark:text-brand-400 font-black text-lg mt-1">{formatPrice(item.price)}</p>
                  {inCart && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -left-2 w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center text-base font-black shadow-lg shadow-brand-500/40">{inCart.quantity}</motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Cart ── */}
      <div className="w-[420px] flex-shrink-0 flex flex-col bg-white dark:bg-surface-900 rounded-3xl border-2 border-surface-200 dark:border-surface-800 overflow-hidden shadow-2xl">
        <div className="p-5 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
              <div><h3 className="font-black text-xl">سفارش جاری</h3><p className="text-white/70 text-sm">{itemCount} آیتم</p></div>
            </div>
            {cart.length > 0 && <button onClick={() => setCart([])} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <ShoppingCart className="w-16 h-16 text-surface-200 dark:text-surface-700 mb-3" />
                <p className="text-surface-400 font-bold">سبد خرید خالی</p>
                <p className="text-surface-300 dark:text-surface-600 text-sm mt-1">محصولات رو از سمت چپ انتخاب کنید</p>
              </div>
            ) : cart.map(c => (
              <motion.div key={c.menuItem.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex gap-4 p-4 bg-surface-50 dark:bg-surface-800/50 rounded-2xl">
                <img src={c.menuItem.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-surface-900 dark:text-surface-100 truncate">{c.menuItem.name}</h4>
                  <p className="text-sm text-surface-500 mt-0.5">{formatPrice(c.menuItem.price)}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-surface-700 rounded-xl p-1 border border-surface-200 dark:border-surface-600">
                      <button onClick={() => updateQty(c.menuItem.id, c.quantity - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                        {c.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="w-8 text-center font-black text-lg">{c.quantity}</span>
                      <button onClick={() => updateQty(c.menuItem.id, c.quantity + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 transition-colors"><Plus className="w-4 h-4" /></button>
                    </div>
                    <p className="font-black text-lg text-surface-900 dark:text-surface-100">{formatPrice(c.menuItem.price * c.quantity)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {cart.length > 0 && (
          <div className="flex-shrink-0 border-t-2 border-surface-100 dark:border-surface-800 p-4 space-y-3">
            <div className="flex gap-2">
              {[{ v: 'in-person', l: 'حضوری', i: User }, { v: 'online', l: 'آنلاین', i: Smartphone }].map(t => (
                <button key={t.v} onClick={() => setForm(p => ({ ...p, orderType: t.v as OrderType }))} className={cn('flex-1 py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all', form.orderType === t.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-surface-200 dark:border-surface-700 text-surface-500')}>
                  <t.i className="w-4 h-4" />{t.l}
                </button>
              ))}
              {[{ v: 'cash', l: 'نقد', i: Banknote }, { v: 'card', l: 'کارت', i: CreditCard }].map(p => (
                <button key={p.v} onClick={() => setForm(f => ({ ...f, paymentMethod: p.v as PaymentMethod }))} className={cn('flex-1 py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-bold transition-all', form.paymentMethod === p.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-surface-200 dark:border-surface-700 text-surface-500')}>
                  <p.i className="w-4 h-4" />{p.l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCustomerModal(true)} className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 transition-colors flex items-center justify-center gap-2">
                <User className="w-4 h-4" />{form.firstName ? `${form.firstName} ${form.lastName}` : 'مشتری'}
              </button>
              <input type="number" placeholder="تخفیف" value={form.discount || ''} onChange={e => setForm(p => ({ ...p, discount: parseInt(e.target.value) || 0 }))} className="w-28 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-center text-sm font-bold placeholder:text-surface-400 focus:outline-none focus:border-brand-500" />
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div className="flex-shrink-0 p-5 bg-surface-50 dark:bg-surface-800/50 border-t-2 border-surface-100 dark:border-surface-800">
            <div className="flex items-center justify-between mb-4">
              {form.discount > 0 && <p className="text-xs text-emerald-600">تخفیف: -{formatPrice(form.discount)}</p>}
              <p className="text-2xl font-black text-brand-600 mr-auto">{formatPrice(total)}</p>
            </div>
            <Button className="w-full !py-5 !text-lg !font-black !rounded-2xl !bg-brand-600 hover:!bg-brand-700 !shadow-xl !shadow-brand-500/30" onClick={handleSubmit}>
              <Zap className="w-6 h-6 ml-2" />ثبت سفارش
            </Button>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <Modal open={customerModal} onClose={() => setCustomerModal(false)} title="اطلاعات مشتری" footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCustomerModal(false)}>انصراف</Button>
          <Button onClick={() => setCustomerModal(false)}>تأیید</Button>
        </div>
      }>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="نام" placeholder="نام" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
            <Input label="نام خانوادگی" placeholder="نام خانوادگی" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input label="شماره تماس" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Textarea label="یادداشت" placeholder="توضیحات سفارش..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}
