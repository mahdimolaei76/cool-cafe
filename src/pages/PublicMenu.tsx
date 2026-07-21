import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Menu, X, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore, useCartStore, formatPrice } from '@/store';
import MenuHero from '@/components/menu/MenuHero';
import MenuItemCard from '@/components/menu/MenuItemCard';
import MenuItemRow from '@/components/menu/MenuItemRow';
import CartSheet from '@/components/menu/CartSheet';
import MenuSidebar from '@/components/menu/MenuSidebar';

export default function PublicMenu() {
  const { menuItems: rawMenuItems, categories: rawCategories, loading } = useAppStore();
  const menuItems = rawMenuItems ?? [];
  const categories = rawCategories ?? [];
  const cartItemCount = useCartStore(s => s.getItemCount());
  const cartTotal = useCartStore(s => s.getTotal());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const catScrollRef = useRef<HTMLDivElement>(null);

  const activeCategories = categories?.filter(c => c.isActive).sort((a, b) => a.order - b.order);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategory !== 'all') items = items?.filter(i => i.categoryId === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      items = items?.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, selectedCategory, search]);

  const featuredItems = useMemo(() => menuItems?.filter(i => i.isFeatured && i.isAvailable), [menuItems]);

  useEffect(() => {
    if (catScrollRef.current) {
      const el = catScrollRef.current.querySelector('[data-active="true"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

  // Let a normal vertical mouse-wheel scroll this row horizontally too,
  // since users often don't notice the category bar is scrollable.
  useEffect(() => {
    const el = catScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const renderItems = (items: typeof menuItems, startIndex = 0) => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {items?.map((item, i) => <MenuItemRow key={item.id} item={item} index={startIndex + i} />)}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
        {items?.map((item, i) => <MenuItemCard key={item.id} item={item} index={startIndex + i} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <MenuHero />

      {/* Sticky Nav */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 py-2.5">
            <button onClick={() => setSidebarOpen(true)} aria-label="منو" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex-shrink-0">
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1 min-w-0">
              <div ref={catScrollRef} className="overflow-x-auto flex items-center gap-1.5 no-scrollbar">
                <button
                  data-active={selectedCategory === 'all'}
                  onClick={() => setSelectedCategory('all')}
                  className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all', selectedCategory === 'all' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400')}
                >همه</button>
                {activeCategories?.map(cat => (
                  <button
                    key={cat.id}
                    data-active={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap', selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400')}
                  >
                    <span className="text-sm ml-1">{cat.icon}</span>{cat.name}
                  </button>
                ))}
              </div>
              {/* Edge-fade hint: this row scrolls horizontally */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent" />
            </div>

            {/* View Toggle */}
            <button
              onClick={() => setViewMode((v: 'grid' | 'list') => v === 'grid' ? 'list' : 'grid')}
              aria-label="تغییر نمای نمایش"
              className="hidden xs:flex w-11 h-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex-shrink-0"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>

            <button onClick={() => setShowSearch(!showSearch)} aria-label="جستجو" className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex-shrink-0">
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pb-2.5">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} autoFocus className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-36">
        {selectedCategory === 'all' && !search && featuredItems?.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⭐</span>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">پیشنهاد ویژه</h2>
            </div>
            {renderItems(featuredItems.slice(0, 6))}
          </section>
        )}

        {selectedCategory === 'all' && !search ? (
          menuItems.length === 0 ? (
            loading ? (
              <div className="space-y-10 mt-6">
                {[1, 2].map(section => (
                  <div key={section}>
                    <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 items-stretch">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                          <div className="aspect-square bg-zinc-200 dark:bg-zinc-800" />
                          <div className="p-3 space-y-2 bg-white dark:bg-zinc-900">
                            <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-bold">منو هنوز آماده نشده</p>
                <p className="text-zinc-400 text-sm mt-1">به زودی برمی‌گردیم!</p>
              </div>
            )
          ) : activeCategories?.map(cat => {
            const catItems = menuItems?.filter(i => i.categoryId === cat.id);
            if (catItems?.length === 0) return null;
            return (
              <section key={cat.id} className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{cat.name}</h2>
                  <span className="text-xs text-zinc-400">({catItems?.length})</span>
                </div>
                {renderItems(catItems)}
              </section>
            );
          })
        ) : (
          <section className="mt-6">
            {filteredItems?.length > 0 ? (
              <>
                <p className="text-sm text-zinc-500 mb-3">{filteredItems?.length} محصول</p>
                {renderItems(filteredItems)}
              </>
            ) : (
              <div className="text-center py-20">
                <Search className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-bold">موردی یافت نشد</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Floating Cart */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="max-w-md mx-auto">
              <button
                onClick={() => setCartOpen(true)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-brand-600 text-white rounded-2xl shadow-2xl shadow-brand-600/40 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-brand-700 text-[10px] font-black rounded-full flex items-center justify-center">{cartItemCount}</span>
                  </div>
                  <span className="font-bold text-sm">مشاهده سبد</span>
                </div>
                <span className="font-black">{formatPrice(cartTotal)}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
      <MenuSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
