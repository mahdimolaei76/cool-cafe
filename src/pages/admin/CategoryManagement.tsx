import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore, formatPrice } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import type { Category } from '@/types';

export default function CategoryManagement() {
  const { categories: rawCategories, menuItems: rawMenuItems, addCategory, updateCategory, deleteCategory } = useAppStore();
  const categories = rawCategories ?? [];
  const menuItems = rawMenuItems ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '☕', order: 0, isActive: true });

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const openCreate = () => {
    setEditingCat(null);
    setForm({ name: '', slug: '', icon: '☕', order: categories?.length + 1, isActive: true });
    setModalOpen(true);
  };
  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order, isActive: cat.isActive });
    setModalOpen(true);
  };
  const handleSave = async () => {
    const slug = form.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)/g, '');
    if (editingCat) await updateCategory(editingCat.id, { ...form, slug });
    else await addCategory({ ...form, slug });
    setModalOpen(false);
  };
  const handleDelete = async () => { if (deleteId) { await deleteCategory(deleteId); setDeleteId(null); } };

  const moveCategory = (id: string, direction: 'up' | 'down') => {
    const idx = sorted.findIndex(c => c.id === id);
    if (direction === 'up' && idx > 0) {
      updateCategory(sorted[idx].id, { order: sorted[idx - 1].order });
      updateCategory(sorted[idx - 1].id, { order: sorted[idx].order });
    } else if (direction === 'down' && idx < sorted?.length - 1) {
      updateCategory(sorted[idx].id, { order: sorted[idx + 1].order });
      updateCategory(sorted[idx + 1].id, { order: sorted[idx].order });
    }
  };

  const emojiOptions = ['☕', '🧊', '🍵', '🎂', '🍰', '🥐', '🍳', '🥪', '🥤', '🍕', '🥗', '🍩', '🧁', '🥞', '🍔'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">دسته‌بندی‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{categories?.length} دسته‌بندی · ترتیب نمایش در منوی مشتری</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن دسته‌بندی</Button>
      </div>

      <Card>
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Plus className="w-6 h-6" />}
            title="هنوز دسته‌بندی‌ای ثبت نشده"
            description="برای شروع، اولین دسته‌بندی منو را اضافه کنید"
            action={<Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن دسته‌بندی</Button>}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {sorted?.map((cat, idx) => {
                const catItems = menuItems?.filter(m => m.categoryId === cat.id);
                const isExpanded = expandedCat === cat.id;
                return (
                  <motion.div key={cat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => moveCategory(cat.id, 'up')} disabled={idx === 0} className="p-0.5 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveCategory(cat.id, 'down')} disabled={idx === sorted?.length - 1} className="p-0.5 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCat(isExpanded ? null : cat.id)}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</h3>
                          <Badge variant={cat.isActive ? 'success' : 'default'} dot>{cat.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{catItems?.length} آیتم</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(cat)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteId(cat.id)} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {/* Expanded — show items */}
                    <AnimatePresence>
                      {isExpanded && catItems?.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pr-12 pl-4 py-2 space-y-1">
                            {catItems?.map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</span>
                                <span className="text-xs font-bold text-brand-600">{formatPrice(item.price)}</span>
                                <Badge variant={item.isAvailable ? 'success' : 'danger'}>{item.isAvailable ? 'موجود' : 'ناموجود'}</Badge>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCat ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editingCat ? 'ذخیره' : 'افزودن'}</Button>
          </div>
        }>
        <div className="p-6 space-y-4">
          <Input label="نام" placeholder="نام دسته‌بندی" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">آیکون</label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions?.map(emoji => (
                <button key={emoji} type="button" onClick={() => setForm(p => ({ ...p, icon: emoji }))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === emoji ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-900/30' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>{emoji}</button>
              ))}
            </div>
          </div>
          <Input label="ترتیب نمایش" type="number" value={String(form.order)} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">فعال</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="حذف دسته‌بندی" message="تمام آیتم‌های این دسته‌بندی بدون دسته می‌شوند. ادامه می‌دهید؟" confirmText="حذف" />
    </div>
  );
}
