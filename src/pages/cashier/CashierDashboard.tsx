import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Clock, ChefHat, Package, Plus, ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore, formatPrice } from '@/store';
import { useAuthStore } from '@/store/authStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
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
    </div>
  );
}
