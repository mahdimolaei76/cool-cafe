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
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
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
