import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4 text-surface-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
}
