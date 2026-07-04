import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, ShoppingBag, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import dayjs from 'dayjs';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Card from '@/components/ui/Card';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b', '#d97706'];

export default function Sales() {
  const { orders: rawOrders, menuItems: rawMenuItems, categories: rawCategories } = useAppStore();
  const orders = rawOrders ?? [];
  const menuItems = rawMenuItems ?? [];
  const categories = rawCategories ?? [];
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const periodDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const activeOrders = useMemo(() => orders?.filter(o => o.status !== 'cancelled'), [orders]);

  const periodOrders = useMemo(() => {
    const cutoff = dayjs().subtract(periodDays[period], 'day');
    return activeOrders?.filter(o => dayjs(o.createdAt).isAfter(cutoff));
  }, [activeOrders, period]);

  const totalRevenue = periodOrders.reduce((s, o) => s + o.total, 0);
  const totalOrdersCount = periodOrders?.length;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
  const onlineOrders = periodOrders?.filter(o => o.orderType === 'online');
  const inPersonOrders = periodOrders?.filter(o => o.orderType === 'in-person');
  const onlineRevenue = onlineOrders.reduce((s, o) => s + o.total, 0);
  const inPersonRevenue = inPersonOrders.reduce((s, o) => s + o.total, 0);

  const revenueByDay = useMemo(() => {
    const days = periodDays[period];
    return Array.from({ length: Math.min(days, 30) })?.map((_, i) => {
      const numDays = Math.min(days, 30);
      const date = dayjs().subtract(numDays - 1 - i, 'day');
      const dayOrders = periodOrders.filter(o => dayjs(o.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD'));
      return {
        date: date.format('MM/DD'),
        revenue: Math.round(dayOrders.reduce((s, o) => s + o.total, 0) / 1000),
        orders: dayOrders?.length,
      };
    });
  }, [periodOrders, period]);

  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {};
    periodOrders.forEach(o => {
      o.items.forEach(item => {
        const mi = menuItems.find(m => m.id === item.menuItemId);
        const cat = mi ? categories.find(c => c.id === mi.categoryId) : null;
        const name = cat?.name || 'سایر';
        catMap[name] = (catMap[name] || 0) + item.subtotal;
      });
    });
    return Object.entries(catMap)?.map(([name, value]) => ({ name, value: Math.round(value / 1000) })).sort((a, b) => b.value - a.value);
  }, [periodOrders, menuItems, categories]);

  const topProducts = useMemo(() => {
    const prodMap: Record<string, { name: string; sold: number; revenue: number; }> = {};
    periodOrders.forEach(o => {
      o.items.forEach(item => {
        if (!prodMap[item.name]) prodMap[item.name] = { name: item.name, sold: 0, revenue: 0 };
        prodMap[item.name].sold += item.quantity;
        prodMap[item.name].revenue += item.subtotal;
      });
    });
    return Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);
  }, [periodOrders]);

  const orderTypeData = [
    { name: 'آنلاین', value: onlineOrders?.length, revenue: onlineRevenue },
    { name: 'حضوری', value: inPersonOrders?.length, revenue: inPersonRevenue },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">فروش و حسابداری</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">تحلیل درآمد و عملکرد</p>
        </div>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          {(['7d', '30d', '90d', '1y'] as const)?.map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', period === p ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300')}>
              {p === '7d' ? '۷ روز' : p === '30d' ? '۳۰ روز' : p === '90d' ? '۹۰ روز' : '۱ سال'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'کل درآمد', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'کل سفارش‌ها', value: totalOrdersCount, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
          { label: 'میانگین سفارش', value: formatPrice(avgOrderValue), icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400' },
          { label: 'درآمد آنلاین', value: formatPrice(onlineRevenue), icon: Users, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
        ]?.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-400">{s.label}</p>
                  <p className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</p>
                </div>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.color)}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">روند درآمد (هزار تومان)</h3>
          <div className="h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">بر اساس دسته‌بندی</h3>
          <div className="h-[200px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {categoryBreakdown?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS?.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} formatter={(v) => `${Number(v)} هزار تومان`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {categoryBreakdown.length > 0 ? categoryBreakdown.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS?.length] }} />
                  <span className="text-zinc-600 dark:text-zinc-400 text-xs">{c.name}</span>
                </div>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs">{c.value} هزار</span>
              </div>
            )) : (
              <p className="text-sm text-zinc-400 text-center py-4">داده‌ای برای این بازه زمانی ثبت نشده</p>
            )}
          </div>
        </Card>
      </div>

      {/* Best selling & order types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">پرفروش‌ترین‌ها</h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? topProducts.slice(0, 8).map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.name}</p>
                  <p className="text-xs text-zinc-400">{p.sold} فروش</p>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(p.revenue)}</span>
              </div>
            )) : (
              <p className="text-sm text-zinc-400 text-center py-8">داده‌ای برای این بازه زمانی ثبت نشده</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">نوع سفارش</h3>
          <div className="h-[200px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} name="سفارش" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
              <p className="text-xs text-zinc-400">آنلاین</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">{formatPrice(onlineRevenue)}</p>
              <p className="text-xs text-zinc-400">{onlineOrders?.length} سفارش</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-center">
              <p className="text-xs text-zinc-400">حضوری</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">{formatPrice(inPersonRevenue)}</p>
              <p className="text-xs text-zinc-400">{inPersonOrders?.length} سفارش</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
