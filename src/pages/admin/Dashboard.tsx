import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import dayjs from 'dayjs';
import { cn } from '@/utils/cn';
import { useAppStore, formatPrice } from '@/store';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function Dashboard() {
  const { orders, menuItems, categories } = useAppStore();

  const metrics = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = dayjs().subtract(1, 'day').startOf('day');

    const todayOrders = orders.filter(o => dayjs(o.createdAt).isAfter(today) && o.status !== 'cancelled');
    const yesterdayOrders = orders.filter(o => dayjs(o.createdAt).isAfter(yesterday) && dayjs(o.createdAt).isBefore(today) && o.status !== 'cancelled');

    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    return {
      totalRevenue,
      totalOrders: activeOrders.length,
      averageOrderValue: activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0,
      todayRevenue,
      todayOrders: todayOrders.length,
      pendingOrders,
      revenueChange: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0,
      ordersChange: yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : 0,
    };
  }, [orders]);

  const revenueChart = useMemo(() => {
    const days = 14;
    return Array.from({ length: days }).map((_, i) => {
      const date = dayjs().subtract(days - 1 - i, 'day');
      const dayOrders = orders?.filter(o =>
        dayjs(o.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD') && o.status !== 'cancelled'
      );
      return {
        date: date.format('MM/DD'),
        revenue: Math.round(dayOrders.reduce((s, o) => s + o.total, 0) / 1000),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const categoryPerformance = useMemo(() => {
    const catMap: Record<string, { name: string; revenue: number; count: number; }> = {};
    orders?.filter(o => o.status !== 'cancelled').forEach(o => {
      o.items.forEach(item => {
        const mi = menuItems.find(m => m.id === item.menuItemId);
        const cat = mi ? categories.find(c => c.id === mi.categoryId) : null;
        const catName = cat?.name || 'سایر';
        if (!catMap[catName]) catMap[catName] = { name: catName, revenue: 0, count: 0 };
        catMap[catName].revenue += item.subtotal;
        catMap[catName].count += item.quantity;
      });
    });
    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [orders, menuItems, categories]);

  const recentOrders = orders.slice(0, 5);

  const statusLabels: Record<string, string> = {
    pending: 'در انتظار',
    preparing: 'در حال آماده‌سازی',
    ready: 'آماده',
    delivered: 'تحویل شده',
    cancelled: 'لغو شده',
  };

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'default' | 'danger'> = {
    pending: 'warning',
    preparing: 'info',
    ready: 'success',
    delivered: 'default',
    cancelled: 'danger',
  };

  const statCards = [
    { label: 'کل درآمد', value: formatPrice(metrics.totalRevenue), change: metrics.revenueChange, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'کل سفارش‌ها', value: metrics.totalOrders, change: metrics.ordersChange, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'میانگین سفارش', value: formatPrice(metrics.averageOrderValue), change: null, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'سفارش‌های معلق', value: metrics.pendingOrders, change: null, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">داشبورد</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">خلاصه وضعیت امروز کافه</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{stat.label}</p>
                  <p className="mt-2 text-xl font-bold text-surface-900 dark:text-surface-100">{stat.value}</p>
                  {stat.change !== null && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {stat.change >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={cn('text-xs font-medium', stat.change >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {Math.abs(stat.change).toFixed(1)}% نسبت به دیروز
                      </span>
                    </div>
                  )}
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">روند درآمد</h3>
                <p className="text-xs text-surface-400 mt-0.5">۱۴ روز گذشته (هزار تومان)</p>
              </div>
            </div>
            <div className="h-[280px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} dx={-8} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }}
                    formatter={(value) => [`${Number(value)} هزار تومان`, 'درآمد']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">بر اساس دسته‌بندی</h3>
            <div className="h-[280px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformance} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '13px' }} formatter={(value) => [formatPrice(Number(value)), 'درآمد']} />
                  <Bar dataKey="revenue" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">سفارش‌های اخیر</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800">
                  <th className="text-right py-3 px-3 text-xs font-medium text-surface-400">شماره</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-surface-400">مشتری</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-surface-400">وضعیت</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-surface-400">مبلغ</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-surface-400">زمان</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-surface-50 dark:border-surface-800/50 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-medium text-surface-900 dark:text-surface-100" dir="ltr">{order.orderNumber}</td>
                    <td className="py-3 px-3 text-surface-600 dark:text-surface-400">{order.customerFirstName} {order.customerLastName}</td>
                    <td className="py-3 px-3"><Badge variant={statusColors[order.status]} dot>{statusLabels[order.status]}</Badge></td>
                    <td className="py-3 px-3 font-medium text-surface-900 dark:text-surface-100">{formatPrice(order.total)}</td>
                    <td className="py-3 px-3 text-surface-400 text-xs" dir="ltr">{dayjs(order.createdAt).format('MM/DD HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
