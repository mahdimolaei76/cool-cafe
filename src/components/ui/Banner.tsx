import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Circle } from 'lucide-react';
import { cn } from '@/utils/cn';

export type BannerVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BannerProps {
  variant?: BannerVariant;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
}

// Same 5-variant palette as Badge so status colors read consistently
// everywhere in the app, in both light and dark mode.
const variantStyles: Record<BannerVariant, { bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    bg: 'bg-zinc-100 dark:bg-zinc-800/60',
    border: 'border-zinc-200 dark:border-zinc-700',
    text: 'text-zinc-700 dark:text-zinc-300',
    iconColor: 'text-zinc-500 dark:text-zinc-400',
  },
};

const defaultIcons: Record<BannerVariant, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  danger: <XCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  neutral: <Circle className="w-5 h-5" />,
};

export default function Banner({ variant = 'info', title, children, icon, className, action }: BannerProps) {
  const s = variantStyles[variant];
  return (
    <div
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 p-4 rounded-2xl border', s.bg, s.border, className)}
    >
      <div className={cn('flex-shrink-0 mt-0.5', s.iconColor)}>{icon ?? defaultIcons[variant]}</div>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('font-bold', s.text)}>{title}</p>}
        {children && <div className={cn('text-sm mt-0.5', s.text, 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
