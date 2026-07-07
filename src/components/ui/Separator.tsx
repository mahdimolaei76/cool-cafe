import { cn } from '@/utils/cn';

/** Thin horizontal rule used to visually section off groups of content. */
export default function Separator({ className }: { className?: string }) {
  return <hr className={cn('border-t border-zinc-200 dark:border-zinc-800 my-2', className)} />;
}
