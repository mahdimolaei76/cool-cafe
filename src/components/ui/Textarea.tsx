import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900',
            'placeholder:text-surface-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500',
            'transition-all duration-200 resize-none',
            'dark:bg-surface-900 dark:border-surface-700 dark:text-surface-100',
            error && 'border-danger',
            className
          )}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
