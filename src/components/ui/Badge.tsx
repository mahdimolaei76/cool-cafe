import { cn } from '@/utils/cn';

interface BadgeProps {
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

// Same 5-status palette as Banner (`default`/`neutral` are aliases of the
// same neutral style) so badges and banners always read as the same
// semantic color across the whole app, in both themes.
export default function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    neutral: 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    brand: 'bg-brand-100 text-brand-800 border border-brand-200 dark:bg-brand-900/40 dark:text-brand-400 dark:border-brand-800',
  };

  const dotColors = {
    default: 'bg-zinc-400',
    neutral: 'bg-zinc-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    brand: 'bg-brand-500',
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
