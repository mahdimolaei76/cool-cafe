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
      className="h-full"
    >
      <div className={cn(
        'bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden transition-all duration-300 h-full flex flex-col',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        'border border-zinc-100/80 dark:border-zinc-800',
        'dark:hover:border-zinc-700',
        inCart && 'ring-2 ring-brand-500 border-brand-200 dark:border-brand-800',
        !item.isAvailable && 'opacity-50 grayscale pointer-events-none'
      )}>
        {/* Image */}
        <div className="relative aspect-[4/4] overflow-hidden group bg-zinc-100 dark:bg-zinc-800">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
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
          {/* <motion.button
            onClick={() => addItem(item)}
            whileTap={{ scale: 0.9 }}
            className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/95 backdrop-blur-sm text-brand-700 rounded-xl text-sm font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 hidden md:flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            افزودن به سبد
          </motion.button> */}
        </div>

        {/* Details */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base leading-snug line-clamp-2">
            {item.name}
          </h3>
          <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed min-h-[2.6em]">
            {item.description}
          </p>

          {/* Price & Action */}
          <div className="flex flex-col items-start justify-between gap-2 mt-auto pt-4">
            <div>
              {item.priceType === 'variable' ? (
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {item.priceLabel || 'قیمت بازار'}
                </span>
              ) : (
                <span className="text-lg font-black text-brand-700 dark:text-brand-400">
                  {formatPrice(item.price)}
                </span>
              )}
            </div>

            {/* {inCart ? (
              <div className="flex items-center gap-0.5 bg-brand-50 dark:bg-brand-900/30 rounded-xl p-1 border border-brand-200 dark:border-brand-800 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                  aria-label="کاهش تعداد"
                  className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <span className="w-6 text-center font-black text-brand-700 dark:text-brand-400 text-sm">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                  aria-label="افزایش تعداد"
                  className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => addItem(item)}
                aria-label="افزودن به سبد"
                className="flex items-center justify-center gap-2 px-4 min-h-11 min-w-11 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20 active:shadow-sm"
              >
                <Plus className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
                <span className="hidden md:inline">افزودن</span>
              </motion.button>
            )} */}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
