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
  const { menuItems, categories } = useAppStore();
  const cartItemCount = useCartStore(s => s.getItemCount());
  const cartTotal = useCartStore(s => s.getTotal());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const catScrollRef = useRef<HTMLDivElement>(null);

  const activeCategories = categories.filter(c => c.isActive).sort((a, b) => a.order - b.order);

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

  const renderItems = (items: typeof menuItems, startIndex = 0) => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {items.map((item, i) => <MenuItemRow key={item.id} item={item} index={startIndex + i} />)}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item, i) => <MenuItemCard key={item.id} item={item} index={startIndex + i} />)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <MenuHero />

      {/* Sticky Nav */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-b border-surface-200/60 dark:border-surface-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-2 py-2.5">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 flex-shrink-0">
              <Menu className="w-5 h-5" />
            </button>

            <div ref={catScrollRef} className="flex-1 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
              <button
                data-active={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all', selectedCategory === 'all' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400')}
              >همه</button>
              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  data-active={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap', selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25' : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400')}
                >
                  <span className="ml-1">{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <button
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-500 flex-shrink-0"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>

            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-500 flex-shrink-0">
              {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {showSearch && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pb-2.5">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} autoFocus className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-36">
        {selectedCategory === 'all' && !search && featuredItems.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⭐</span>
              <h2 className="text-lg font-black text-surface-900 dark:text-surface-100">پیشنهاد ویژه</h2>
            </div>
            {renderItems(featuredItems.slice(0, 6))}
          </section>
        )}

        {selectedCategory === 'all' && !search ? (
          activeCategories.map(cat => {
            const catItems = menuItems.filter(i => i.categoryId === cat.id);
            if (catItems.length === 0) return null;
            return (
              <section key={cat.id} className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{cat.icon}</span>
                  <h2 className="text-lg font-black text-surface-900 dark:text-surface-100">{cat.name}</h2>
                  <span className="text-xs text-surface-400">({catItems.length})</span>
                </div>
                {renderItems(catItems)}
              </section>
            );
          })
        ) : (
          <section className="mt-6">
            {filteredItems.length > 0 ? (
              <>
                <p className="text-sm text-surface-500 mb-3">{filteredItems.length} محصول</p>
                {renderItems(filteredItems)}
              </>
            ) : (
              <div className="text-center py-20">
                <Search className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                <p className="text-surface-500 font-bold">موردی یافت نشد</p>
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
