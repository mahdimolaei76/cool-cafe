import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: boolean;
}

export default function Card({ children, className, hover = false, onClick, padding = true }: CardProps) {
  const Comp = hover ? motion.div : 'div';
  const hoverProps = hover
    ? { whileHover: { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }, transition: { duration: 0.2 } }
    : {};

  return (
    <Comp
      className={cn(
        'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800',
        'shadow-sm',
        padding && 'p-6',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...hoverProps}
    >
      {children}
    </Comp>
  );
}
