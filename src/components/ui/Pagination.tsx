import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

// Shared pagination bar for any long admin list — page navigation plus a
// page-size dropdown, so the person can choose how many rows they see at
// once instead of always getting a hardcoded slice of the data.
export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const to = Math.min(clampedPage * pageSize, total);

  // Condensed page number list: first, last, current ±1, with "…" gaps.
  const pageNumbers = (() => {
    const nums: (number | '...')[] = [];
    const add = (n: number) => { if (!nums.includes(n)) nums.push(n); };
    add(1);
    if (clampedPage > 3) nums.push('...');
    for (let p = clampedPage - 1; p <= clampedPage + 1; p++) if (p > 1 && p < totalPages) add(p);
    if (clampedPage < totalPages - 2) nums.push('...');
    if (totalPages > 1) add(totalPages);
    return nums;
  })();

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3', className)}>
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {total === 0 ? 'موردی یافت نشد' : `نمایش ${from.toLocaleString('fa-IR')} تا ${to.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`}
        </span>
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          aria-label="تعداد در هر صفحه"
          className="mr-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          {pageSizeOptions?.map(size => (
            <option key={size} value={size}>{size} در صفحه</option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(clampedPage - 1)}
            disabled={clampedPage === 1}
            aria-label="صفحه قبل"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {pageNumbers.map((n, i) =>
            n === '...' ? (
              <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-zinc-400 text-sm">…</span>
            ) : (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  n === clampedPage
                    ? 'bg-brand-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {n.toLocaleString('fa-IR')}
              </button>
            )
          )}
          <button
            onClick={() => onPageChange(clampedPage + 1)}
            disabled={clampedPage === totalPages}
            aria-label="صفحه بعد"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
