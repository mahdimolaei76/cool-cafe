import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ScrollRowProps {
  children: ReactNode;
  className?: string;
  /** Extra classes for the inner scrollable track (e.g. gap, padding). */
  trackClassName?: string;
}

/**
 * Wraps a horizontally-scrolling row (category pills, filter chips, etc.)
 * with:
 *  - left/right arrow buttons (desktop, shown only when there's more to see)
 *  - fade-out gradient hints on whichever edge has overflow
 *  - native touch/trackpad swipe (untouched — just a regular scroll container)
 *  - mouse-wheel vertical scroll translated to horizontal, so a normal
 *    scroll wheel works even though the row itself doesn't scroll vertically
 *
 * This is RTL-aware: in a `dir="rtl"` document "start" is the right edge,
 * so the arrows and fade sides are computed from scrollLeft sign rather
 * than assumed left/right.
 */
export default function ScrollRow({ children, className, trackClassName }: ScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth - clientWidth > 4;
    if (!hasOverflow) {
      setCanScrollStart(false);
      setCanScrollEnd(false);
      return;
    }
    // scrollLeft is negative in RTL in most browsers (Chrome/Firefox spec).
    const atMin = scrollLeft <= -(scrollWidth - clientWidth) + 4;
    const atMax = scrollLeft >= -4;
    if (isRtl) {
      setCanScrollStart(!atMax); // more content to the right (start)
      setCanScrollEnd(!atMin); // more content to the left (end)
    } else {
      setCanScrollStart(scrollLeft > 4);
      setCanScrollEnd(scrollLeft < scrollWidth - clientWidth - 4);
    }
  }, [isRtl]);

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    if (!el) return;
    const onScroll = () => updateArrows();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    // Translate vertical mouse-wheel motion into horizontal scroll, so
    // users don't need to notice/find a horizontal-only scrollbar.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
    };
  }, [updateArrows, children]);

  const scrollBy = (direction: 'start' | 'end') => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    const sign = isRtl ? -1 : 1;
    const delta = direction === 'start' ? -amount * sign : amount * sign;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative group/scrollrow', className)}>
      {/* Edge fades — hint that there's more content off-screen */}
      {canScrollStart && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 rtl:right-auto rtl:left-0 rtl:bg-gradient-to-r" />
      )}
      {canScrollEnd && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 rtl:left-auto rtl:right-0 rtl:bg-gradient-to-l" />
      )}

      {/* Arrow buttons — desktop only (hover-revealed), hidden on touch via pointer:coarse check omitted for simplicity, just hidden on small screens */}
      {canScrollStart && (
        <button
          type="button"
          aria-label="اسکرول به راست"
          onClick={() => scrollBy('start')}
          className="hidden sm:flex absolute -right-3 rtl:right-auto rtl:-left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md items-center justify-center text-zinc-500 hover:text-brand-600 hover:border-brand-300 transition-colors opacity-0 group-hover/scrollrow:opacity-100"
        >
          <ChevronRight className="w-4 h-4 rtl:hidden" />
          <ChevronLeft className="w-4 h-4 hidden rtl:block" />
        </button>
      )}
      {canScrollEnd && (
        <button
          type="button"
          aria-label="اسکرول به چپ"
          onClick={() => scrollBy('end')}
          className="hidden sm:flex absolute -left-3 rtl:left-auto rtl:-right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md items-center justify-center text-zinc-500 hover:text-brand-600 hover:border-brand-300 transition-colors opacity-0 group-hover/scrollrow:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 rtl:hidden" />
          <ChevronRight className="w-4 h-4 hidden rtl:block" />
        </button>
      )}

      <div ref={ref} className={cn('flex overflow-x-auto no-scrollbar scroll-smooth', trackClassName)}>
        {children}
      </div>
    </div>
  );
}
