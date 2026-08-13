import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, Wallet, History, User, Phone, Filter } from 'lucide-react';
import { useAppStore, formatPrice } from '@/store';
import { customerApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Banner from '@/components/ui/Banner';
import Pagination from '@/components/ui/Pagination';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import CreditAdjustModal from '@/components/admin/CreditAdjustModal';
import { iranianMobileError, normalizeIranianMobile } from '@/utils/phone';
import { formatJalaliDateTime } from '@/utils/jalali';
import type { Customer, CreditAdjustKind, HistoryEntry, PaymentMethod } from '@/types';

const statusLabels: Record<string, string> = { delivered: 'تحویل شده', cancelled: 'لغو شده' };
const creditKindLabels: Record<string, string> = { increase: 'افزایش اعتبار', purchase: 'خرید جدید', settle: 'تسویه حساب کامل', order_charge: 'کسر بابت تحویل سفارش' };

export default function CustomerManagement() {
  const { customers, customersTotal, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useAppStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', creditEnabled: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creditModalCustomer, setCreditModalCustomer] = useState<Customer | null>(null);

  // ── تاریخچه سفارشات modal state ──
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<'' | PaymentMethod>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCustomers({ search, page, pageSize }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, pageSize]);

  // Reset to page 1 whenever the search text changes the result set.
  useEffect(() => { setPage(1); }, [search]);

  const sorted = useMemo(
    () => [...(customers ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [customers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ firstName: '', lastName: '', phone: '', creditEnabled: false });
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ firstName: c.firstName, lastName: c.lastName, phone: c.phone, creditEnabled: c.creditEnabled });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const phoneErr = iranianMobileError(form.phone, true);
    if (phoneErr) { setFormError(phoneErr); return; }
    setFormError(null);
    setSaving(true);
    try {
      const data = { ...form, phone: normalizeIranianMobile(form.phone) };
      if (editing) await updateCustomer(editing.id, data);
      else await addCustomer(data);
      toast.success('اطلاعات مشتری ذخیره شد');
      setModalOpen(false);
      fetchCustomers({ search, page, pageSize });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ثبت اطلاعات با خطا مواجه شد');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      toast.success('مشتری حذف شد');
      fetchCustomers({ search, page, pageSize });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف با خطا مواجه شد');
    } finally {
      setDeleteId(null);
    }
  };

  const handleAdjust = async (kind: CreditAdjustKind, amount: number) => {
    if (!creditModalCustomer) return;
    const updated = await customerApi.adjustCredit(creditModalCustomer.id, kind, amount);
    await fetchCustomers({ search, page, pageSize });
    setCreditModalCustomer(updated);
  };

  const loadHistory = async (c: Customer, opts?: { page?: number }) => {
    setHistoryLoading(true);
    try {
      const p = opts?.page ?? historyPage;
      const data = await customerApi.history(c.id, {
        page: p,
        pageSize: historyPageSize,
        dateFrom: historyDateFrom || undefined,
        dateTo: historyDateTo || undefined,
        paymentMethod: historyPaymentFilter || undefined,
      });
      setHistoryEntries(data.entries || []);
      setHistoryTotal(data.total || 0);
    } catch {
      toast.error('دریافت تاریخچه با خطا مواجه شد');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (c: Customer) => {
    setHistoryCustomer(c);
    setHistoryPage(1);
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setHistoryPaymentFilter('');
    setHistoryEntries([]);
    setHistoryTotal(0);
    loadHistory(c, { page: 1 });
  };

  // Re-fetch whenever a history filter or page/pageSize changes, while the
  // modal is open — the modal's size/shape never changes, only its content.
  useEffect(() => {
    if (!historyCustomer) return;
    loadHistory(historyCustomer, { page: historyPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historyPageSize, historyDateFrom, historyDateTo, historyPaymentFilter]);

  // بستن دسترسی به تغییر وضعیت پرداخت اعتباری وقتی حساب صفر نیست —
  // همان محدودیتی که در بک‌اند هم اعمال می‌شود.
  const creditToggleLocked = !!editing && editing.creditBalance !== 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">مدیریت مشتری‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{customersTotal ?? 0} مشتری</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن مشتری</Button>
      </div>

      <Input
        type="text"
        placeholder="جستجو با نام یا شماره تلفن..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search className="w-5 h-5" />}
      />

      <Card padding={false} className="overflow-hidden">
        {!loading && sorted.length === 0 ? (
          <EmptyState
            icon={<User className="w-6 h-6" />}
            title="هنوز مشتری‌ای ثبت نشده"
            description="برای شروع، اولین مشتری را اضافه کنید"
            action={<Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن مشتری</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">نام</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">تلفن</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">پرداخت اعتباری</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-zinc-500">مانده حساب</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                      <td colSpan={5} className="py-3 px-4">
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : sorted.map(c => {
                  const debt = c.creditBalance < 0;
                  return (
                    <tr key={c.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">{c.firstName} {c.lastName}</td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400" dir="ltr">{c.phone}</td>
                      <td className="py-3 px-4">
                        <Badge variant={c.creditEnabled ? 'success' : 'default'} dot>{c.creditEnabled ? 'فعال' : 'غیرفعال'}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {c.creditEnabled ? (
                          <span className={debt ? 'font-bold text-red-600' : c.creditBalance > 0 ? 'font-bold text-emerald-600' : 'text-zinc-400'}>
                            {c.creditBalance === 0 ? 'تسویه' : formatPrice(Math.abs(c.creditBalance))}
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openHistory(c)} title="تاریخچه سفارشات" className="p-2 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"><History className="w-4 h-4" /></button>
                          {c.creditEnabled && (
                            <button onClick={() => setCreditModalCustomer(c)} title="تغییر مقدار بدهی" className="p-2 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><Wallet className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => openEdit(c)} title="ویرایش" className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(c.id)} title="حذف" className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={customersTotal ?? 0}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1); }}
          className="border-t border-zinc-100 dark:border-zinc-800"
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش مشتری' : 'افزودن مشتری'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.phone}>{editing ? 'ذخیره' : 'افزودن'}</Button>
          </div>
        }>
        <div className="p-6 space-y-4">
          {formError && <Banner variant="danger">{formError}</Banner>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="نام" placeholder="نام" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
            <Input label="نام خانوادگی" placeholder="نام خانوادگی" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input
            label="شماره تلفن"
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            icon={<Phone className="w-4 h-4" />}
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            error={iranianMobileError(form.phone, true) || undefined}
          />
          <label className={`flex items-center gap-2 ${creditToggleLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={form.creditEnabled}
              disabled={creditToggleLocked}
              onChange={e => setForm(p => ({ ...p, creditEnabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">قابلیت پرداخت اعتباری</span>
          </label>
          {creditToggleLocked && (
            <p className="text-xs text-amber-600">
              تا زمانی که حساب اعتباری این مشتری تسویه (صفر) نشود، امکان تغییر این گزینه وجود ندارد.
            </p>
          )}
          {editing && editing.creditEnabled && editing.creditBalance !== 0 && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                {editing.creditBalance < 0 ? 'بدهی فعلی' : 'اعتبار فعلی'}
              </span>
              <span className={editing.creditBalance < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                {formatPrice(Math.abs(editing.creditBalance))}
              </span>
            </div>
          )}
          {editing && editing.creditEnabled && (
            <Button variant="outline" className="w-full" icon={<Wallet className="w-4 h-4" />} onClick={() => setCreditModalCustomer(editing)}>
              تغییر مقدار بدهی
            </Button>
          )}
        </div>
      </Modal>

      {/* Credit adjustment modal */}
      <CreditAdjustModal
        open={!!creditModalCustomer}
        onClose={() => setCreditModalCustomer(null)}
        customer={creditModalCustomer}
        onAdjust={handleAdjust}
      />

      {/* Order + credit history modal — fixed size/shape; only its
          content (filters/rows/pagination) changes while loading. */}
      <Modal open={!!historyCustomer} onClose={() => setHistoryCustomer(null)} title={historyCustomer ? `تاریخچه سفارشات — ${historyCustomer.firstName} ${historyCustomer.lastName}` : ''} size="xl">
        <div className="p-6 space-y-5">
          {/* بخش فیلترها */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/30 space-y-3">
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />فیلترها
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <JalaliDatePicker label="از تاریخ" value={historyDateFrom} onChange={v => { setHistoryDateFrom(v); setHistoryPage(1); }} />
              <JalaliDatePicker label="تا تاریخ" value={historyDateTo} onChange={v => { setHistoryDateTo(v); setHistoryPage(1); }} />
              <div className="col-span-2">
                <Select
                  label="نوع پرداخت"
                  value={historyPaymentFilter}
                  onChange={e => { setHistoryPaymentFilter(e.target.value as any); setHistoryPage(1); }}
                  options={[
                    { value: '', label: 'همه روش‌های پرداخت' },
                    { value: 'cash', label: 'نقدی' },
                    { value: 'card', label: 'کارت' },
                    { value: 'online', label: 'اینترنتی' },
                    { value: 'credit', label: 'اعتباری (تغییرات حساب)' },
                    { value: 'other', label: 'سایر' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 min-h-[280px]">
            {historyLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl h-16 animate-pulse" />
              ))
            ) : historyEntries.length ? (
              historyEntries.map(entry => (
                <div key={`${entry.entryType}-${entry.id}`} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-between">
                  <div>
                    {entry.entryType === 'order' ? (
                      <>
                        <p className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100" dir="ltr">{entry.orderNumber}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{formatJalaliDateTime(entry.createdAt)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{creditKindLabels[entry.creditKind || ''] || 'اعتباری'}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{formatJalaliDateTime(entry.createdAt)}</p>
                      </>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={entry.amount < 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                      {entry.entryType === 'credit' ? (entry.amount < 0 ? '-' : '+') : ''}{formatPrice(Math.abs(entry.amount))}
                    </p>
                    {entry.entryType === 'order' ? (
                      <Badge variant={entry.orderStatus === 'cancelled' ? 'danger' : 'default'}>{statusLabels[entry.orderStatus || ''] || entry.orderStatus}</Badge>
                    ) : (
                      <Badge variant="info">اعتباری</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-400 text-center py-16">موردی برای این فیلتر یافت نشد.</p>
            )}
          </div>

          <Pagination
            page={historyPage}
            pageSize={historyPageSize}
            total={historyTotal}
            onPageChange={setHistoryPage}
            onPageSizeChange={size => { setHistoryPageSize(size); setHistoryPage(1); }}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="حذف مشتری" message="این مشتری حذف شود؟ این عملیات قابل بازگشت نیست." confirmText="حذف" />
    </div>
  );
}
