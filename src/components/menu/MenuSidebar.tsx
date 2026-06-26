import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Coffee, Info, Phone, MapPin, Clock, Shield, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store';

interface MenuSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function MenuSidebar({ open, onClose }: MenuSidebarProps) {
  const { settings, theme, toggleTheme } = useAppStore();

  const menuItems = [
    { icon: Home, label: 'صفحه اصلی', href: '/' },
    { icon: Coffee, label: 'منو', href: '/' },
    { icon: Info, label: 'درباره ما', href: '#about' },
    { icon: Phone, label: 'تماس با ما', href: '#contact' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-[300px] bg-white dark:bg-surface-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-800 dark:bg-brand-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-serif font-bold text-lg">C</span>
                </div>
                <div>
                  <h2 className="font-bold text-surface-900 dark:text-surface-100">{settings.name}</h2>
                  <p className="text-xs text-surface-400">کافه و رستوران</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-surface-400" />
                  <span className="font-medium">{item.label}</span>
                </a>
              ))}
              
              <div className="pt-4 border-t border-surface-100 dark:border-surface-800 mt-4">
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">پنل مدیریت</span>
                </Link>
              </div>
            </nav>

            {/* Info Section */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800">
              <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-surface-600 dark:text-surface-400">{settings.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <p className="text-sm text-surface-600 dark:text-surface-400">۷ صبح تا ۱۰ شب</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <p className="text-sm text-surface-600 dark:text-surface-400 font-mono" dir="ltr">{settings.phone}</p>
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-100 dark:bg-surface-800 transition-colors"
              >
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                </span>
                <div className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  theme === 'dark' ? 'bg-brand-600' : 'bg-surface-300'
                )}>
                  <div className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                    theme === 'dark' ? 'right-1' : 'left-1'
                  )} />
                </div>
              </button>
            </div>

            {/* Social */}
            <div className="p-4 border-t border-surface-100 dark:border-surface-800">
              <div className="flex items-center justify-center gap-4">
                <a href="#" className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-pink-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
                <a href="#" className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-green-500 transition-colors">
                  <Phone className="w-5 h-5" />
                </a>
              </div>
              <p className="text-center text-xs text-surface-400 mt-3">نسخه ۱.۰.۰</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
