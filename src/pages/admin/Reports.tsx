import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, Filter } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore, formatPrice } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { formatJalali } from '@/utils/jalali';

export default function Reports() {
  const { orders: rawOrders, categories: rawCategories, menuItems: rawMenuItems } = useAppStore();
  const orders = rawOrders ?? [];
  const categories = rawCategories ?? [];
  const menuItems = rawMenuItems ?? [];
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredOrders = useMemo(() => {
    return orders?.filter(o => {
      const d = dayjs(o.createdAt);
      if (d.isBefore(dayjs(dateFrom).startOf('day')) || d.isAfter(dayjs(dateTo).endOf('day'))) return false;
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterType && o.orderType !== filterType) return false;
      if (filterCategory) {
        const hasItem = o.items.some(item => {
          const mi = menuItems.find(m => m.id === item.menuItemId);
          return mi?.categoryId === filterCategory;
        });
        if (!hasItem) return false;
      }
      return true;
    });
  }, [orders, dateFrom, dateTo, filterStatus, filterType, filterCategory, menuItems]);

  const report = useMemo(() => {
    const active = filteredOrders?.filter(o => o.status !== 'cancelled');
    const totalRevenue = active.reduce((s, o) => s + o.total, 0);
    const totalOrders = active?.length;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalDiscount = active.reduce((s, o) => s + o.discount, 0);
    const cancelled = filteredOrders?.filter(o => o.status === 'cancelled')?.length;
    return { totalRevenue, totalOrders, avgOrder, totalDiscount, cancelled };
  }, [filteredOrders]);

  const exportCSV = () => {
    const headers = ['شماره سفارش', 'تاریخ', 'مشتری', 'وضعیت', 'نوع', 'پرداخت', 'جمع', 'تخفیف', 'نهایی', 'آیتم‌ها'];
    const rows = filteredOrders?.map(o => [
      o.orderNumber,
      formatJalali(o.createdAt, 'YYYY/MM/DD HH:mm'),
      `${o.customerFirstName} ${o.customerLastName}`,
      o.status,
      o.orderType,
      o.paymentMethod,
      o.subtotal,
      o.discount,
      o.total,
      o.items?.map(i => `${i.name}×${i.quantity}`).join('; '),
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows?.map(r => r?.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `گزارش-${formatJalali(dateFrom, 'YYYY-MM-DD')}-تا-${formatJalali(dateTo, 'YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setPreset = (preset: 'today' | 'week' | 'month') => {
    if (preset === 'today') { setDateFrom(dayjs().format('YYYY-MM-DD')); setDateTo(dayjs().format('YYYY-MM-DD')); }
    if (preset === 'week') { setDateFrom(dayjs().startOf('week').format('YYYY-MM-DD')); setDateTo(dayjs().format('YYYY-MM-DD')); }
    if (preset === 'month') { setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD')); setDateTo(dayjs().format('YYYY-MM-DD')); }
  };

  const statusLabels: Record<string, string> = { pending: 'در انتظار', preparing: 'در حال آماده‌سازی', ready: 'آماده', delivered: 'تحویل شده', cancelled: 'لغو شده' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">گزارش‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">گزارش‌گیری و خروجی اکسل</p>
        </div>
        <Button onClick={exportCSV} icon={<Download className="w-4 h-4" />} variant="outline">خروجی CSV</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-zinc-400" />
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">فیلترها</h3>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {[{ key: 'today', label: 'امروز' }, { key: 'week', label: 'این هفته' }, { key: 'month', label: 'این ماه' }]?.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key as 'today' | 'week' | 'month')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <JalaliDatePicker label="از تاریخ" value={dateFrom} onChange={setDateFrom} />
          <JalaliDatePicker label="تا تاریخ" value={dateTo} onChange={setDateTo} />
          <Select label="دسته‌بندی" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} placeholder="همه" options={categories?.map(c => ({ value: c.id, label: c.name }))} />
          <Select label="وضعیت" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} placeholder="همه" options={[
            { value: 'pending', label: 'در انتظار' },
            { value: 'preparing', label: 'در حال آماده‌سازی' },
            { value: 'ready', label: 'آماده' },
            { value: 'delivered', label: 'تحویل شده' },
            { value: 'cancelled', label: 'لغو شده' },
          ]} />
          <Select label="نوع" value={filterType} onChange={e => setFilterType(e.target.value)} placeholder="همه" options={[
            { value: 'in-person', label: 'حضوری' },
            { value: 'online', label: 'آنلاین' },
          ]} />
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'درآمد', value: formatPrice(report.totalRevenue) },
          { label: 'سفارش‌ها', value: report.totalOrders },
          { label: 'میانگین', value: formatPrice(report.avgOrder) },
          { label: 'تخفیف‌ها', value: formatPrice(report.totalDiscount) },
          { label: 'لغو شده', value: report.cancelled },
        ]?.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <p className="text-xs text-zinc-400">{s.label}</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Orders table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">سفارش‌ها ({filteredOrders?.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <EmptyState
              icon={<Filter className="w-6 h-6" />}
              title="سفارشی یافت نشد"
              description="بازه زمانی یا فیلترها را تغییر دهید"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400">شماره</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400 hidden sm:table-cell">مشتری</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400">وضعیت</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400 hidden md:table-cell">نوع</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400 hidden md:table-cell">پرداخت</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400">مبلغ</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-zinc-400 hidden lg:table-cell">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 50).map(o => (
                  <tr key={o.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100" dir="ltr">{o.orderNumber}</td>
                    <td className="py-3 px-3 hidden sm:table-cell text-zinc-600 dark:text-zinc-400">{o.customerFirstName} {o.customerLastName}</td>
                    <td className="py-3 px-3"><Badge variant={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : o.status === 'pending' ? 'warning' : 'info'} dot>{statusLabels[o.status]}</Badge></td>
                    <td className="py-3 px-3 hidden md:table-cell text-zinc-600 dark:text-zinc-400">{o.orderType === 'online' ? 'آنلاین' : 'حضوری'}</td>
                    <td className="py-3 px-3 hidden md:table-cell text-zinc-600 dark:text-zinc-400">{{ cash: 'نقدی', card: 'کارت', online: 'اینترنتی', credit: 'اعتباری', other: 'سایر' }[o.paymentMethod] || o.paymentMethod}</td>
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(o.total)}</td>
                    <td className="py-3 px-3 hidden lg:table-cell text-zinc-400 text-xs">{formatJalali(o.createdAt, 'MM/DD HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredOrders.length > 50 && (
          <p className="text-xs text-zinc-400 text-center mt-4">نمایش ۵۰ سفارش از {filteredOrders.length}. برای دیدن همه، خروجی بگیرید.</p>
        )}
      </Card>
    </div>
  );
}
