import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { useAppStore, formatPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';

export default function CashierDashboard() {
  const { orders: rawOrders } = useAppStore();
  const orders = rawOrders ?? [];
  const user = useAuthStore(s => s.user);

  const today = dayjs().startOf('day');

  const stats = useMemo(() => {
    const todayOrders = orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    const myOrders = todayOrders?.filter(o => o.cashier === user?.name);
    const pending = orders?.filter(o => o.status === 'pending')?.length;
    const preparing = orders?.filter(o => o.status === 'preparing')?.length;
    const ready = orders?.filter(o => o.status === 'ready')?.length;
    return {
      todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0),
      todayCount: todayOrders?.length,
      myCount: myOrders?.length,
      myRevenue: myOrders.reduce((s, o) => s + o.total, 0),
      avgOrder: todayOrders?.length > 0 ? todayOrders.reduce((s, o) => s + o.total, 0) / todayOrders?.length : 0,
      pending, preparing, ready,
    };
  }, [orders, today, user]);

  // Hourly chart
  const hourlyData = useMemo(() => {
    const hours: Record<number, { revenue: number; count: number; }> = {};
    for (let h = 7; h <= 22; h++) hours[h] = { revenue: 0, count: 0 };
    orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled').forEach(o => {
      const h = dayjs(o.createdAt).hour();
      if (hours[h]) { hours[h].revenue += o.total; hours[h].count++; }
    });
    return Object.entries(hours)?.map(([h, d]) => ({ hour: `${h}:00`, revenue: Math.round(d.revenue / 1000), count: d.count }));
  }, [orders, today]);

  // Top items today
  const topItems = useMemo(() => {
    const map: Record<string, { name: string; count: number; }> = {};
    orders?.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled').forEach(o => {
      o.items.forEach(i => {
        if (!map[i.name]) map[i.name] = { name: i.name, count: 0 };
        map[i.name].count += i.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders, today]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-surface-900 dark:text-surface-100">
          سلام {user?.name} 👋
        </h1>
        <p className="text-sm text-surface-500 mt-1">خلاصه امروز · {dayjs().format('dddd، D MMMM')}</p>
      </div>

      {/* Active orders alert */}
      {(stats.pending + stats.preparing + stats.ready) > 0 && (
        <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-200 dark:border-brand-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-brand-800 dark:text-brand-400">سفارش‌های فعال</p>
            <p className="text-sm text-brand-600 dark:text-brand-500">
              {stats.pending} در انتظار · {stats.preparing} آماده‌سازی · {stats.ready} آماده تحویل
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'فروش امروز', value: formatPrice(stats.todayRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'سفارش‌های امروز', value: stats.todayCount, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
          { label: 'سفارش‌های من', value: stats.myCount, icon: ArrowUpRight, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
          { label: 'میانگین سفارش', value: formatPrice(stats.avgOrder), icon: TrendingUp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
        ]?.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-surface-400 font-medium">{s.label}</p>
                  <p className="mt-1.5 text-xl font-black text-surface-900 dark:text-surface-100">{s.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly chart */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card>
            <h3 className="font-bold text-surface-900 dark:text-surface-100 mb-4">فروش ساعتی (هزار تومان)</h3>
            <div className="h-[220px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} name="درآمد" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Top items today */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <h3 className="font-bold text-surface-900 dark:text-surface-100 mb-4">پرفروش‌های امروز</h3>
            {topItems?.length > 0 ? (
              <div className="space-y-3">
                {topItems?.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center text-xs font-black">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-surface-500">{item.count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 text-center py-8">هنوز فروشی ثبت نشده</p>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
