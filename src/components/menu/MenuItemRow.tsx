import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MenuItem } from '@/types';
import { useCartStore, formatPrice } from '@/store';

interface Props {
  item: MenuItem;
  index: number;
}

export default function MenuItemRow({ item, index }: Props) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find(ci => ci.menuItem.id === item.id);
  const inCart = !!cartItem;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={cn(
        'flex items-center gap-4 p-3 rounded-2xl transition-all',
        'bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800',
        'hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700',
        inCart && 'ring-2 ring-brand-500/50 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/20',
        !item.isAvailable && 'opacity-40 pointer-events-none'
      )}
    >
      {/* Image */}
      <img
        src={item.image}
        alt={item.name}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
        loading="lazy"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base truncate">
              {item.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 hidden sm:block">
              {item.description}
            </p>
          </div>
          {item.isFeatured && (
            <span className="flex-shrink-0 px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] font-bold rounded-full">
              ویژه
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="font-black text-brand-600 dark:text-brand-400 text-sm sm:text-base">
            {formatPrice(item.price)}
          </span>

          {inCart ? (
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <button
                onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
              <span className="w-6 text-center font-black text-sm text-zinc-900 dark:text-zinc-100">{cartItem.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addItem(item)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              افزودن
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
