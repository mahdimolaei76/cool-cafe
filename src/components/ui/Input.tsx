import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900',
              'placeholder:text-surface-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
              'transition-all duration-200',
              'dark:bg-surface-900 dark:border-surface-700 dark:text-surface-100 dark:placeholder:text-surface-500',
              'dark:focus:ring-brand-500/30 dark:focus:border-brand-500',
              icon && 'pr-10',
              error && 'border-danger focus:ring-danger/20 focus:border-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
