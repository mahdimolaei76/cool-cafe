import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Save, X as XIcon } from 'lucide-react';
import { useAppStore, formatItemPrice } from '@/store';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import type { Category } from '@/types';

export default function CategoryManagement() {
  const { categories: rawCategories, menuItems: rawMenuItems, addCategory, updateCategory, deleteCategory, reorderCategories } = useAppStore();
  const categories = rawCategories ?? [];
  const menuItems = rawMenuItems ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '☕', order: 0, isActive: true });

  // Reorder mode: instead of the HTML5 drag-and-drop API (which doesn't
  // work on touch/mobile at all without extra polyfills — the actual
  // reason reordering "was broken"), the admin explicitly enters reorder
  // mode, moves rows up/down with simple buttons, then saves once.
  const [reorderMode, setReorderMode] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Tiebreak by id when `order` values collide (e.g. leftover duplicate
  // order values from data created before this was fixed) — otherwise
  // the sort would be unstable across renders.
  const sorted = [...categories].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const displayList = reorderMode
    ? draftOrder.map(id => catById.get(id)).filter((c): c is Category => !!c)
    : sorted;

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

  const startReorder = () => {
    setDraftOrder(sorted.map(c => c.id));
    setReorderMode(true);
  };
  const cancelReorder = () => {
    setReorderMode(false);
    setDraftOrder([]);
  };
  const moveDraft = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draftOrder.length) return;
    setDraftOrder(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const saveReorder = async () => {
    setSaving(true);
    try {
      await reorderCategories(draftOrder);
      setReorderMode(false);
      setDraftOrder([]);
    } finally {
      setSaving(false);
    }
  };

  const emojiGroups: { label: string; icons: string[] }[] = [
    { label: 'قهوه و اسپرسو', icons: ['☕', '🫘', '🧋', '🍫', '🫖', '🍵', '🥤', '🧊', '🧉', '🫗', '🥛', '🍼'] },
    { label: 'نوشیدنی سرد', icons: ['🥤', '🍹', '🥂', '🍷', '🍺', '🍸', '🍾', '🧃', '🫙', '🧊'] },
    { label: 'نوشیدنی گرم', icons: ['☕', '🫖', '🍵', '🌿', '🍃', '🌱'] },
    { label: 'شیرینی و دسر', icons: ['🎂', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '🥧', '🍨', '🍦', '🧇', '🥐', '🥖', '🫓', '🥨', '🥯', '🍞', '🥞'] },
    { label: 'صبحانه و غذا', icons: ['🍳', '🥚', '🥞', '🧆', '🥙', '🌮', '🌯', '🫔', '🥗', '🥘', '🍲', '🫕', '🍜', '🍝', '🍛', '🍱', '🥪', '🥫', '🍕', '🍔', '🌭', '🍟', '🍗', '🥩', '🥓'] },
    { label: 'میوه و سالم', icons: ['🍇', '🍓', '🫐', '🍑', '🍍', '🥭', '🥑', '🥝', '🍋', '🍊', '🫒', '🥜', '🫘', '🌰'] },
    { label: 'ویژه و سایر', icons: ['⭐', '🌟', '✨', '🎁', '🎉', '🏆', '💎', '🔥', '❤️', '🌹', '🌺', '🌸', '🍀', '🎵', '🎶', '🪄', '🎪', '🏠', '🌙', '☀️'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">دسته‌بندی‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{categories?.length} دسته‌بندی · ترتیب نمایش در منوی مشتری</p>
        </div>
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              <Button variant="outline" onClick={cancelReorder} disabled={saving} icon={<XIcon className="w-4 h-4" />}>انصراف</Button>
              <Button onClick={saveReorder} loading={saving} icon={<Save className="w-4 h-4" />}>ذخیره ترتیب</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startReorder} disabled={sorted.length < 2} icon={<ArrowUpDown className="w-4 h-4" />}>
                تغییر ترتیب نمایش
              </Button>
              <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن دسته‌بندی</Button>
            </>
          )}
        </div>
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
              {displayList?.map((cat, idx) => {
                const catItems = menuItems?.filter(m => m.categoryId === cat.id);
                const isExpanded = expandedCat === cat.id;
                return (
                  <motion.div key={cat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                      {reorderMode && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moveDraft(idx, -1)}
                            disabled={idx === 0}
                            aria-label="انتقال به بالا"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-600 hover:border-brand-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveDraft(idx, 1)}
                            disabled={idx === displayList.length - 1}
                            aria-label="انتقال به پایین"
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-600 hover:border-brand-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                      <div
                        className={`flex-1 min-w-0 ${reorderMode ? '' : 'cursor-pointer'}`}
                        onClick={() => !reorderMode && setExpandedCat(isExpanded ? null : cat.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</h3>
                          <Badge variant={cat.isActive ? 'success' : 'default'} dot>{cat.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{catItems?.length} آیتم</p>
                      </div>
                      {!reorderMode && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(cat)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(cat.id)} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    {/* Expanded — show items */}
                    <AnimatePresence>
                      {!reorderMode && isExpanded && catItems?.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pr-12 pl-4 py-2 space-y-1">
                            {catItems?.map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</span>
                                <span className="text-xs font-bold text-brand-600">{formatItemPrice(item)}</span>
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
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 flex-shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">{form.icon}</span>
            <Input label="نام" placeholder="نام دسته‌بندی" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="flex-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">آیکون</label>
            <div className="max-h-64 overflow-y-auto pr-1 space-y-3 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
              {emojiGroups.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1.5">{group.label}</p>
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                    {group.icons.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                        className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${form.icon === emoji ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-900/30' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Manual order input removed — ترتیب نمایش is now controlled entirely
              by the "تغییر ترتیب نمایش" reorder mode in the list above, which
              keeps sort_order values always distinct and in sync with what
              the admin sees, instead of letting two categories collide on
              the same manually-typed number. */}
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
