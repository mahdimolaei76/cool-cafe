import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Star, Eye, EyeOff, Upload, Image, X, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useAppStore, formatItemPrice } from '@/store';
import { cn } from '@/utils/cn';
import { menuApi } from '@/lib/api';
import { toast } from 'sonner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import type { MenuItem } from '@/types';

export default function MenuManagement() {
  const { menuItems: rawMenuItems, categories: rawCategories, addMenuItem, updateMenuItem, deleteMenuItem, uploadImage, fetchMenuItems } = useAppStore();
  const menuItems = rawMenuItems ?? [];
  const categories = rawCategories ?? [];
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', description: '', price: '', priceType: 'fixed' as 'fixed' | 'variable', priceLabel: '', categoryId: '', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false,
  });

  const filtered = useMemo(() => {
    let items = menuItems;
    if (search) {
      const q = search.toLowerCase();
      items = items?.filter(i => i.name.toLowerCase().includes(q));
    }
    if (filterCategory) {
      items = items?.filter(i => i.categoryId === filterCategory);
    }
    return items;
  }, [menuItems, search, filterCategory]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => { setPage(1); }, [search, filterCategory]);
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', description: '', price: '', priceType: 'fixed', priceLabel: '', categoryId: categories[0]?.id || '', image: '/images/coffee-hot.jpg', isAvailable: true, isFeatured: false });
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description, price: String(item.price), priceType: item.priceType || 'fixed', priceLabel: item.priceLabel || '', categoryId: item.categoryId, image: item.image, isAvailable: item.isAvailable, isFeatured: item.isFeatured });
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadImage(file);
        setForm(p => ({ ...p, image: url }));
      } catch {
        // fallback base64
        const reader = new FileReader();
        reader.onloadend = () => setForm(p => ({ ...p, image: reader.result as string }));
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      description: form.description,
      price: form.priceType === 'variable' ? 0 : (parseFloat(form.price) || 0),
      priceType: form.priceType,
      priceLabel: form.priceType === 'variable' ? (form.priceLabel || 'قیمت بازار') : '',
      categoryId: form.categoryId,
      image: form.image,
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
    };
    if (editingItem) {
      await updateMenuItem(editingItem.id, data);
    } else {
      await addMenuItem(data);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMenuItem(deleteId);
      setDeleteId(null);
    }
  };

  // ── ترتیب آیتم‌های هر دسته‌بندی ──
  const [reorderCatId, setReorderCatId] = useState<string | null>(null);
  const [reorderItems, setReorderItems] = useState<MenuItem[]>([]);
  const [savingReorder, setSavingReorder] = useState(false);

  const openReorder = (catId: string) => {
    const catItems = [...menuItems]
      .filter(i => i.categoryId === catId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setReorderItems(catItems);
    setReorderCatId(catId);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    setReorderItems(prev => {
      const arr = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  };

  const saveReorder = async () => {
    setSavingReorder(true);
    try {
      for (let i = 0; i < reorderItems.length; i++) {
        await menuApi.update(reorderItems[i].id, { ...reorderItems[i], order: i + 1 });
      }
      await fetchMenuItems();
      toast.success('ترتیب آیتم‌ها ذخیره شد');
      setReorderCatId(null);
    } catch {
      toast.error('ذخیره ترتیب با خطا مواجه شد');
    } finally {
      setSavingReorder(false);
    }
  };

  const presetImages = [
    { value: '/images/coffee-hot.jpg', label: 'قهوه گرم' },
    { value: '/images/coffee-cold.jpg', label: 'قهوه سرد' },
    { value: '/images/cake.jpg', label: 'کیک' },
    { value: '/images/pastry.jpg', label: 'شیرینی' },
    { value: '/images/breakfast.jpg', label: 'صبحانه' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">مدیریت منو</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{menuItems?.length} آیتم</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن آیتم</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'کل آیتم‌ها', value: menuItems?.length, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
          { label: 'موجود', value: menuItems?.filter(m => m.isAvailable)?.length, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { label: 'ناموجود', value: menuItems?.filter(m => !m.isAvailable)?.length, color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
          { label: 'ویژه', value: menuItems?.filter(m => m.isFeatured)?.length, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
        ]?.map(stat => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
          <Input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-5 h-5" />}
            className="flex-1"
          />
          <Select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            placeholder="همه دسته‌ها"
            options={categories?.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
            className="sm:w-56"
          />
          {filterCategory && (
            <Button
              variant="outline"
              icon={<ArrowUpDown className="w-4 h-4" />}
              onClick={() => openReorder(filterCategory)}
            >
              ترتیب آیتم‌ها
            </Button>
          )}
        </div>

        {filtered?.length > 0 ? (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {paginated?.map((item, index) => {
                const cat = categories.find(c => c.id === item.categoryId);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                    className={`bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden group ${!item.isAvailable && 'opacity-60'}`}
                  >
                    <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-700">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {item.isFeatured && (
                          <span className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                            <Star className="w-4 h-4 text-white fill-white" />
                          </span>
                        )}
                        {!item.isAvailable && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">ناموجود</span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => updateMenuItem(item.id, { isAvailable: !item.isAvailable })} className="p-2.5 bg-white rounded-xl hover:bg-zinc-100 transition-colors">
                          {item.isAvailable ? <EyeOff className="w-4 h-4 text-zinc-600" /> : <Eye className="w-4 h-4 text-zinc-600" />}
                        </button>
                        <button onClick={() => openEdit(item)} className="p-2.5 bg-white rounded-xl hover:bg-zinc-100 transition-colors">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button onClick={() => setDeleteId(item.id)} className="p-2.5 bg-white rounded-xl hover:bg-zinc-100 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</h3>
                        <Badge className="flex-shrink-0 !text-base !px-2">{cat?.icon}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">{item.description}</p>
                      {item.priceType === 'variable' ? (
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.priceLabel || 'قیمت بازار'}</p>
                      ) : (
                        <p className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatItemPrice(item)}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={size => { setPageSize(size); setPage(1); }}
            className="mt-2 -mx-2"
          />
          </>
        ) : (
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title={menuItems.length === 0 ? 'هنوز آیتمی اضافه نشده' : 'موردی یافت نشد'}
            description={menuItems.length === 0 ? 'برای شروع، اولین آیتم منو را اضافه کنید' : 'جستجو یا فیلتر را تغییر دهید'}
            action={menuItems.length === 0 ? <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن آیتم</Button> : undefined}
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'ویرایش آیتم' : 'افزودن آیتم جدید'} size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={!form.name || (form.priceType === 'fixed' ? !form.price : !form.priceLabel)}>{editingItem ? 'ذخیره تغییرات' : 'افزودن آیتم'}</Button>
          </div>
        }
      >
        <div className="p-6 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">تصویر</label>
            <div className="flex gap-4">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex-shrink-0">
                {form.image ? (
                  <div className="relative w-full h-full group">
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(p => ({ ...p, image: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                    <Image className="w-8 h-8 mb-1" />
                    <span className="text-xs">بدون تصویر</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<Upload className="w-4 h-4" />}
                >
                  آپلود تصویر
                </Button>
                <p className="text-xs text-zinc-400">یا یک تصویر پیش‌فرض انتخاب کنید:</p>
                <div className="flex gap-2 flex-wrap">
                  {presetImages?.map(img => (
                    <button
                      key={img.value}
                      onClick={() => setForm(p => ({ ...p, image: img.value }))}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${form.image === img.value ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-zinc-200 dark:border-zinc-700'}`}
                    >
                      <img src={img.value} alt={img.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Input label="نام آیتم" placeholder="مثال: کاپوچینو" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Textarea label="توضیحات" placeholder="توضیح کوتاه درباره این آیتم..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          {/* Price type toggle: fixed number vs. free-text (e.g. "قیمت بازار")
              whose amount the cashier sets per order instead of here. */}
          <div>
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 block">نوع قیمت‌گذاری</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, priceType: 'fixed' }))}
                className={cn(
                  'py-2.5 rounded-xl border-2 text-sm font-bold transition-all',
                  form.priceType === 'fixed' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                )}
              >
                عدد ثابت
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, priceType: 'variable' }))}
                className={cn(
                  'py-2.5 rounded-xl border-2 text-sm font-bold transition-all',
                  form.priceType === 'variable' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500'
                )}
              >
                متنی (مثلاً قیمت بازار)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.priceType === 'variable' ? (
              <Input
                label="برچسب قیمت"
                placeholder="مثال: قیمت بازار / توافقی"
                value={form.priceLabel}
                onChange={e => setForm(p => ({ ...p, priceLabel: e.target.value }))}
              />
            ) : (
              <Input label="قیمت (تومان)" type="number" placeholder="۰" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
            )}
            <Select label="دسته‌بندی" value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} options={categories?.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
          </div>

          <div className="flex items-center gap-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} className="w-5 h-5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500" />
              <div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">موجود</span>
                <p className="text-xs text-zinc-400">این آیتم در منو نمایش داده شود</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(p => ({ ...p, isFeatured: e.target.checked }))} className="w-5 h-5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500" />
              <div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">ویژه</span>
                <p className="text-xs text-zinc-400">در بخش پیشنهاد ویژه نمایش داده شود</p>
              </div>
            </label>
          </div>

        </div>
      </Modal>

      {/* Item Reorder Modal */}
      <Modal
        open={!!reorderCatId}
        onClose={() => setReorderCatId(null)}
        title={`ترتیب آیتم‌ها — ${categories.find(c => c.id === reorderCatId)?.icon} ${categories.find(c => c.id === reorderCatId)?.name}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReorderCatId(null)}>انصراف</Button>
            <Button onClick={saveReorder} loading={savingReorder}>ذخیره ترتیب</Button>
          </div>
        }
      >
        <div className="p-6 space-y-2">
          {reorderItems.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">آیتمی در این دسته‌بندی وجود ندارد.</p>
          ) : reorderItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                <p className="text-xs text-zinc-400">{formatItemPrice(item)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-brand-600 hover:border-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === reorderItems.length - 1}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-brand-600 hover:border-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف آیتم"
        message="آیا از حذف این آیتم اطمینان دارید؟ این عمل قابل بازگشت نیست."
        confirmText="حذف"
      />
    </div>
  );
}
