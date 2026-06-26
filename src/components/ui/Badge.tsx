import { cn } from '@/utils/cn';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export default function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  const variants = {
    default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  };

  const dotColors = {
    default: 'bg-surface-400',
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
