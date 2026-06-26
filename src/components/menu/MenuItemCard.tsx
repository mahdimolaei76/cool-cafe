import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MenuItem } from '@/types';
import { useCartStore, formatPrice } from '@/store';

interface MenuItemCardProps {
  item: MenuItem;
  index: number;
}

export default function MenuItemCard({ item, index }: MenuItemCardProps) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find(ci => ci.menuItem.id === item.id);
  const inCart = !!cartItem;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={cn(
        'bg-white dark:bg-surface-900 rounded-3xl overflow-hidden transition-all duration-300',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        'border border-surface-100/80 dark:border-surface-800',
        'dark:hover:border-surface-700',
        inCart && 'ring-2 ring-brand-500 border-brand-200 dark:border-brand-800',
        !item.isAvailable && 'opacity-50 grayscale pointer-events-none'
      )}>
        {/* Image */}
        <div className="relative aspect-[5/4] overflow-hidden group">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Featured tag */}
          {item.isFeatured && (
            <div className="absolute top-3 right-3">
              <span className="px-3 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-full shadow-lg shadow-brand-500/30 tracking-wide">
                پیشنهاد ویژه
              </span>
            </div>
          )}

          {/* Cart indicator */}
          {inCart && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-3 left-3 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg"
            >
              {cartItem.quantity}
            </motion.div>
          )}

          {/* Quick add on hover (desktop) */}
          <motion.button
            onClick={() => addItem(item)}
            whileTap={{ scale: 0.9 }}
            className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/95 backdrop-blur-sm text-brand-700 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 hidden md:flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            افزودن به سبد
          </motion.button>
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="font-bold text-surface-900 dark:text-surface-100 text-base leading-tight">
            {item.name}
          </h3>
          <p className="mt-1.5 text-[13px] text-surface-500 dark:text-surface-400 line-clamp-2 leading-relaxed min-h-[2.6em]">
            {item.description}
          </p>

          {/* Price & Action */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <span className="text-lg font-black text-brand-700 dark:text-brand-400">
                {formatPrice(item.price)}
              </span>
            </div>

            {inCart ? (
              /* Quantity Stepper */
              <div className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 rounded-xl p-1 border border-brand-200 dark:border-brand-800">
                <button
                  onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-surface-800 flex items-center justify-center text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <span className="w-8 text-center font-black text-brand-700 dark:text-brand-400 text-base">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-surface-800 flex items-center justify-center text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            ) : (
              /* Add Button */
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => addItem(item)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 active:shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                <span className="md:hidden">+</span>
                <span className="hidden md:inline">افزودن</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
