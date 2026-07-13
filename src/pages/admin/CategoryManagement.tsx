import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Save, X as XIcon, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, formatItemPrice } from '@/store';
import { menuApi } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import type { Category, MenuItem } from '@/types';

// Safe emojis — Unicode 12 and below, renders on all browsers/Android 9+/iOS 12+
const emojiGroups: { label: string; icons: string[] }[] = [
  { label: 'قهوه و نوشیدنی گرم', icons: ['☕', '🍵', '🥛', '🍼', '🧉', '🧊'] },
  { label: 'نوشیدنی سرد',        icons: ['🥤', '🍹', '🥂', '🍷', '🍺', '🍸', '🍾', '🧃'] },
  { label: 'شیرینی و دسر',       icons: ['🎂', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍮', '🥧', '🍨', '🍦', '🧇', '🥐', '🥖', '🥨', '🥯', '🍞', '🥞'] },
  { label: 'صبحانه و غذا',       icons: ['🍳', '🥚', '🥙', '🌮', '🌯', '🥗', '🥘', '🍲', '🍜', '🍝', '🍛', '🍱', '🥪', '🥫', '🍕', '🍔', '🌭', '🍟', '🍗', '🥩', '🥓'] },
  { label: 'میوه و سالم',        icons: ['🍇', '🍓', '🍑', '🍍', '🥭', '🥑', '🥝', '🍋', '🍊', '🥜', '🌰'] },
  { label: 'ویژه و سایر',        icons: ['⭐', '🌟', '✨', '🎁', '🎉', '🏆', '💎', '🔥', '❤️', '🌹', '🌺', '🌸', '🍀', '🎵', '🎶', '🏠', '🌙', '☀️'] },
];

/** Drag-and-drop list — generic, reusable, no external deps. */
function DnDList<T extends { id: string }>({
  items, onReorder, renderItem,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    overIdx.current = idx;
  };
  const handleDrop = () => {
    const from = dragIdx.current;
    const to = overIdx.current;
    if (from === null || to === null || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
    dragIdx.current = null;
    overIdx.current = null;
  };

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={handleDrop}
          className="cursor-grab active:cursor-grabbing"
        >
          {renderItem(item, idx)}
        </div>
      ))}
    </div>
  );
}

export default function CategoryManagement() {
  const { categories: rawCategories, menuItems: rawMenuItems, addCategory, updateCategory, deleteCategory, reorderCategories, fetchMenuItems } = useAppStore();
  const categories = rawCategories ?? [];
  const menuItems  = rawMenuItems  ?? [];

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingCat,  setEditingCat]  = useState<Category | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '☕', order: 0, isActive: true });

  // ترتیب دسته‌بندی‌ها (کل صفحه)
  const [reorderMode, setReorderMode] = useState(false);
  const [draftOrder,  setDraftOrder]  = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);

  // ترتیب آیتم‌ها داخل مودال ادیت
  const [itemDraft,    setItemDraft]    = useState<MenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const sorted = [...categories].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const displayList = reorderMode
    ? draftOrder.map(id => catById.get(id)).filter((c): c is Category => !!c)
    : sorted;

  const openCreate = () => {
    setEditingCat(null);
    setForm({ name: '', slug: '', icon: '☕', order: categories.length + 1, isActive: true });
    setItemDraft([]);
    setModalOpen(true);
  };

  const openEdit = async (cat: Category) => {
    setEditingCat(cat);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon, order: cat.order, isActive: cat.isActive });
    setItemDraft([]);
    setModalOpen(true);
    setItemsLoading(true);
    try {
      const items = await menuApi.byCategory(cat.id);
      setItemDraft(items ?? []);
    } catch {
      const fallback = menuItems
        .filter(i => i.categoryId === cat.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setItemDraft(fallback);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSave = async () => {
    const slug = form.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)/g, '');
    if (editingCat) await updateCategory(editingCat.id, { ...form, slug });
    else await addCategory({ ...form, slug });

    if (editingCat && itemDraft.length > 0) {
      try {
        await menuApi.reorder(itemDraft.map(i => i.id));
        await fetchMenuItems();
        toast.success('ترتیب آیتم‌ها ذخیره شد');
      } catch {
        toast.error('ترتیب آیتم‌ها ذخیره نشد');
      }
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteCategory(deleteId); setDeleteId(null); }
  };

  const startReorder = () => { setDraftOrder(sorted.map(c => c.id)); setReorderMode(true); };
  const cancelReorder = () => { setReorderMode(false); setDraftOrder([]); };
  const moveDraft = (idx: number, dir: -1 | 1) => {
    const t = idx + dir;
    if (t < 0 || t >= draftOrder.length) return;
    setDraftOrder(p => { const n = [...p]; [n[idx], n[t]] = [n[t], n[idx]]; return n; });
  };
  const saveReorder = async () => {
    setSaving(true);
    try { await reorderCategories(draftOrder); setReorderMode(false); setDraftOrder([]); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">دسته‌بندی‌ها</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{categories.length} دسته‌بندی · ترتیب نمایش در منو</p>
        </div>
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              <Button variant="outline" onClick={cancelReorder} disabled={saving} icon={<XIcon className="w-4 h-4" />}>انصراف</Button>
              <Button onClick={saveReorder} loading={saving} icon={<Save className="w-4 h-4" />}>ذخیره ترتیب</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startReorder} disabled={sorted.length < 2} icon={<ArrowUpDown className="w-4 h-4" />}>ترتیب دسته‌ها</Button>
              <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>افزودن دسته‌بندی</Button>
            </>
          )}
        </div>
      </div>

      {/* List */}
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
              {displayList.map((cat, idx) => {
                const catItems  = menuItems.filter(m => m.categoryId === cat.id);
                const isExpanded = expandedCat === cat.id;
                return (
                  <motion.div key={cat.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      {reorderMode && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button onClick={() => moveDraft(idx, -1)} disabled={idx === 0} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveDraft(idx, 1)} disabled={idx === displayList.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                      )}
                      <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                      <div className={`flex-1 min-w-0 ${reorderMode ? '' : 'cursor-pointer'}`} onClick={() => !reorderMode && setExpandedCat(isExpanded ? null : cat.id)}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{cat.name}</h3>
                          <Badge variant={cat.isActive ? 'success' : 'default'} dot>{cat.isActive ? 'فعال' : 'غیرفعال'}</Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{catItems.length} آیتم</p>
                      </div>
                      {!reorderMode && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(cat)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(cat.id)} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <AnimatePresence>
                      {!reorderMode && isExpanded && catItems.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pr-12 pl-4 py-2 space-y-1">
                            {[...catItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(item => (
                              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
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

      {/* Edit / Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? `ویرایش — ${editingCat.icon} ${editingCat.name}` : 'افزودن دسته‌بندی'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button onClick={handleSave} disabled={!form.name}>{editingCat ? 'ذخیره تغییرات' : 'افزودن'}</Button>
          </div>
        }
      >
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left col — name + icon picker + active */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="w-14 h-14 flex-shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl">{form.icon}</span>
              <Input label="نام دسته‌بندی" placeholder="مثال: نوشیدنی گرم" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="flex-1" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">آیکون</label>
              <div className="h-56 overflow-y-auto space-y-3 rounded-xl border border-zinc-100 dark:border-zinc-800 p-3">
                {emojiGroups.map(g => (
                  <div key={g.label}>
                    <p className="text-xs font-medium text-zinc-400 mb-1.5">{g.label}</p>
                    <div className="grid grid-cols-9 gap-1.5">
                      {g.icons.map(emoji => (
                        <button
                          key={emoji} type="button"
                          onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                          className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${form.icon === emoji ? 'bg-brand-100 ring-2 ring-brand-500 dark:bg-brand-900/30' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                        >{emoji}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">دسته‌بندی فعال باشد</span>
            </label>
          </div>

          {/* Right col — drag-and-drop item reorder */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {editingCat ? 'ترتیب نمایش آیتم‌ها' : 'آیتم‌ها پس از ذخیره قابل ترتیب‌دهی هستند'}
              </p>
              {itemDraft.length > 0 && <span className="text-xs text-zinc-400">{itemDraft.length} آیتم — بکشید برای ترتیب‌دهی</span>}
            </div>

            <div className="flex-1 h-80 overflow-y-auto rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
              {!editingCat ? (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm text-center p-4">ابتدا دسته‌بندی را ذخیره کنید.</div>
              ) : itemsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : itemDraft.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm">آیتمی در این دسته‌بندی وجود ندارد.</div>
              ) : (
                <div className="p-2">
                  <DnDList
                    items={itemDraft}
                    onReorder={setItemDraft}
                    renderItem={(item, idx) => (
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 select-none">
                        <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />
                        <span className="w-5 h-5 flex-shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                        <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        <span className="flex-1 text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</span>
                        <span className="text-xs text-brand-600 font-bold flex-shrink-0">{formatItemPrice(item)}</span>
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
            {editingCat && itemDraft.length > 0 && (
              <p className="text-xs text-zinc-400 mt-2">ترتیب با کلیک «ذخیره تغییرات» اعمال می‌شود.</p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="حذف دسته‌بندی" message="تمام آیتم‌های این دسته‌بندی بدون دسته می‌شوند. ادامه می‌دهید؟" confirmText="حذف" />
    </div>
  );
}
