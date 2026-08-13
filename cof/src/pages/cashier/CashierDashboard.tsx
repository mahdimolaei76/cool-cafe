import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Clock, ChefHat, Package, Plus, ArrowLeft, CreditCard, Banknote, Store, Globe, XCircle, Filter } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore, formatPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import { formatJalaliLong, fromNowFa } from '@/utils/jalali';
import type { Order } from '@/types';

const statusConfig: Record<string, { label: string; icon: typeof Clock; badgeVariant: 'warning' | 'info' | 'success' }> = {
  pending: { label: 'در انتظار', icon: Clock, badgeVariant: 'warning' },
  preparing: { label: 'در حال آماده‌سازی', icon: ChefHat, badgeVariant: 'info' },
  ready: { label: 'آماده تحویل', icon: Package, badgeVariant: 'success' },
};

export default function CashierDashboard() {
  const { orders: rawOrders } = useAppStore();
  const orders = rawOrders ?? [];
  const user = useAuthStore(s => s.user);

  const today = dayjs().startOf('day');

  const stats = useMemo(() => {
    const todayOrders = orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    const pending = orders?.filter(o => o.status === 'pending')?.length || 0;
    const preparing = orders?.filter(o => o.status === 'preparing')?.length || 0;
    const ready = orders?.filter(o => o.status === 'ready')?.length || 0;
    return {
      todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
      todayCount: todayOrders?.length || 0,
      pending, preparing, ready,
      activeTotal: pending + preparing + ready,
    };
  }, [orders, today]);

  const activeOrders: Order[] = useMemo(() => {
    return orders
      ?.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
      ?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      ?.slice(0, 6) || [];
  }, [orders]);

  // ─── گزارش روزانه مفصل‌تر با فیلتر ───
  const [dateFrom, setDateFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [filterType, setFilterType] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const setPreset = (preset: 'today' | 'yesterday' | 'week') => {
    if (preset === 'today') { setDateFrom(dayjs().format('YYYY-MM-DD')); setDateTo(dayjs().format('YYYY-MM-DD')); }
    if (preset === 'yesterday') { setDateFrom(dayjs().subtract(1, 'day').format('YYYY-MM-DD')); setDateTo(dayjs().subtract(1, 'day').format('YYYY-MM-DD')); }
    if (preset === 'week') { setDateFrom(dayjs().startOf('week').format('YYYY-MM-DD')); setDateTo(dayjs().format('YYYY-MM-DD')); }
  };
  const activePreset = (): 'today' | 'yesterday' | 'week' | 'custom' => {
    const t = dayjs().format('YYYY-MM-DD');
    const y = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
    if (dateFrom === t && dateTo === t) return 'today';
    if (dateFrom === y && dateTo === y) return 'yesterday';
    if (dateFrom === weekStart && dateTo === t) return 'week';
    return 'custom';
  };

  const reportOrders = useMemo(() => {
    return orders?.filter(o => {
      const d = dayjs(o.createdAt);
      if (d.isBefore(dayjs(dateFrom).startOf('day')) || d.isAfter(dayjs(dateTo).endOf('day'))) return false;
      if (filterType && o.orderType !== filterType) return false;
      if (filterPayment && o.paymentMethod !== filterPayment) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      return true;
    }) || [];
  }, [orders, dateFrom, dateTo, filterType, filterPayment, filterStatus]);

  const report = useMemo(() => {
    const active = reportOrders.filter(o => o.status !== 'cancelled');
    const cash = active.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const card = active.filter(o => o.paymentMethod === 'card').reduce((s, o) => s + o.total, 0);
    const other = active.filter(o => o.paymentMethod === 'other').reduce((s, o) => s + o.total, 0);
    const inPerson = active.filter(o => o.orderType === 'in-person').length;
    const online = active.filter(o => o.orderType === 'online').length;
    const revenue = active.reduce((s, o) => s + o.total, 0);
    const count = active.length;
    const cancelled = reportOrders.filter(o => o.status === 'cancelled').length;
    return {
      revenue, count,
      avg: count > 0 ? revenue / count : 0,
      cash, card, other,
      inPerson, online,
      cancelled,
    };
  }, [reportOrders]);

  const reportOrdersSorted = useMemo(
    () => [...reportOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reportOrders]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
          سلام {user?.name} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{formatJalaliLong(new Date())}</p>
      </div>

      {/* Primary action — this is what a cashier needs most, front and center */}
      <Link to="/cashier">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-4 p-5 bg-gradient-to-l from-brand-600 to-brand-700 rounded-2xl shadow-lg shadow-brand-500/25 text-white"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="font-black text-lg">ثبت سفارش جدید</p>
            <p className="text-sm text-white/80">شروع یک سفارش تازه برای مشتری</p>
          </div>
          <ArrowLeft className="w-5 h-5 flex-shrink-0" />
        </motion.div>
      </Link>

      {/* Today at a glance — kept to the two numbers a cashier actually
          checks mid-shift; deeper analytics live in Reports/Sales (admin). */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 font-medium">فروش امروز</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 truncate">{formatPrice(stats.todayRevenue)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 font-medium">سفارش‌های امروز</p>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{stats.todayCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active orders queue — the thing a cashier actually monitors */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">سفارش‌های فعال</h3>
          {stats.activeTotal > 0 && (
            <Badge variant="warning" dot>{stats.activeTotal} در جریان</Badge>
          )}
        </div>

        {activeOrders.length > 0 ? (
          <div className="space-y-2">
            {activeOrders.map((order, i) => {
              const config = statusConfig[order.status];
              const isUrgent = dayjs().diff(dayjs(order.createdAt), 'minute') > 15 && order.status === 'pending';
              const StatusIcon = config?.icon ?? Clock;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${isUrgent ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/10' : 'border-zinc-100 dark:border-zinc-800'}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 dark:text-zinc-400">
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {order.customerFirstName} {order.customerLastName}
                      <span className="text-zinc-400 font-mono font-normal mr-1.5" dir="ltr">#{order.orderNumber.replace('COOL-', '')}</span>
                    </p>
                    <p className="text-xs text-zinc-400">{order.items?.length} آیتم · {fromNowFa(order.createdAt)}</p>
                  </div>
                  {config && <Badge variant={config.badgeVariant}>{config.label}</Badge>}
                </motion.div>
              );
            })}
            <Link to="/cashier/orders" className="block text-center text-sm font-bold text-brand-600 hover:text-brand-700 pt-2">
              مشاهده همه سفارش‌ها ←
            </Link>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center py-8">در حال حاضر سفارش فعالی وجود ندارد</p>
        )}
      </Card>

      {/* گزارش روزانه با فیلترهای بیشتر */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-brand-600" />
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">گزارش روزانه</h3>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'today', label: 'امروز' },
            { key: 'yesterday', label: 'دیروز' },
            { key: 'week', label: 'این هفته' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activePreset() === p.key ? 'bg-brand-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              {p.label}
            </button>
          ))}
          {activePreset() === 'custom' && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400">بازه دلخواه</span>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <JalaliDatePicker label="از تاریخ" value={dateFrom} onChange={setDateFrom} />
          <JalaliDatePicker label="تا تاریخ" value={dateTo} onChange={setDateTo} />
          <Select
            label="نوع سفارش"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            options={[{ value: '', label: 'همه' }, { value: 'in-person', label: 'حضوری' }, { value: 'online', label: 'آنلاین' }]}
          />
          <Select
            label="روش پرداخت"
            value={filterPayment}
            onChange={e => setFilterPayment(e.target.value)}
            options={[{ value: '', label: 'همه' }, { value: 'cash', label: 'نقدی' }, { value: 'card', label: 'کارت' }, { value: 'other', label: 'سایر' }]}
          />
          <Select
            label="وضعیت"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: 'همه' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'preparing', label: 'در حال آماده‌سازی' },
              { value: 'ready', label: 'آماده تحویل' },
              { value: 'delivered', label: 'تحویل شده' },
              { value: 'cancelled', label: 'لغو شده' },
            ]}
          />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatPrice(report.revenue)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">درآمد</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
            <p className="text-lg font-black text-blue-700 dark:text-blue-400">{report.count}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">تعداد سفارش</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
            <p className="text-lg font-black text-purple-700 dark:text-purple-400">{formatPrice(report.avg)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">میانگین سفارش</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center">
            <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1"><Banknote className="w-4 h-4" />{formatPrice(report.cash)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">نقدی</p>
          </div>
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-center">
            <p className="text-lg font-black text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1"><CreditCard className="w-4 h-4" />{formatPrice(report.card)}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">کارت</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
            <p className="text-lg font-black text-red-600 dark:text-red-400 flex items-center justify-center gap-1"><XCircle className="w-4 h-4" />{report.cancelled}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">لغو شده</p>
          </div>
        </div>

        {/* Order type breakdown */}
        <div className="flex items-center gap-4 mb-5 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Store className="w-4 h-4" /> حضوری: <span className="font-bold text-zinc-900 dark:text-zinc-100">{report.inPerson}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <Globe className="w-4 h-4" /> آنلاین: <span className="font-bold text-zinc-900 dark:text-zinc-100">{report.online}</span>
          </div>
        </div>

        {/* Orders list for the selected range */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {reportOrdersSorted.length > 0 ? reportOrdersSorted.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {order.customerFirstName} {order.customerLastName}
                  <span className="text-zinc-400 font-mono font-normal mr-1.5" dir="ltr">#{order.orderNumber.replace('COOL-', '')}</span>
                </p>
                <p className="text-xs text-zinc-400">{fromNowFa(order.createdAt)} · {order.paymentMethod === 'cash' ? 'نقدی' : order.paymentMethod === 'card' ? 'کارت' : 'سایر'}</p>
              </div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex-shrink-0">{formatPrice(order.total)}</span>
            </div>
          )) : (
            <p className="text-sm text-zinc-400 text-center py-8">سفارشی در این بازه یافت نشد</p>
          )}
        </div>
      </Card>
    </div>
  );
}
