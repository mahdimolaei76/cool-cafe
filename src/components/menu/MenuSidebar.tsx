import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee, Info, Phone, MapPin, Clock, Shield, Search, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store';
const logoIcon = '/images/logo.jpg'

interface MenuSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function MenuSidebar({ open, onClose }: MenuSidebarProps) {
  const { settings, theme, toggleTheme } = useAppStore();

  const menuItems = [
    { icon: Coffee, label: 'منو', href: '/' },
    { icon: Search, label: 'پیگیری سفارش', href: '/track' },
    { icon: Info, label: 'درباره ما', href: '/about' },
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
            className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-[300px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-800 dark:bg-brand-600 rounded-xl flex items-center justify-center">
                  <img
                    className="
                text-brand-600
                font-black
                text-3xl
                md:text-4xl
                rounded-3xl
                scale-120
              "
                    src={logoIcon}
                  >

                  </img>
                </div>
                <div>
                  <h2 className="font-bold text-zinc-900 dark:text-zinc-100">{settings.name}</h2>
                  <p className="text-xs text-zinc-400">کافه</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {menuItems?.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <item.icon className="w-5 h-5 text-zinc-400" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
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
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{settings.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{settings.workingHours || '۷ صبح تا ۱۰ شب'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono" dir="ltr">{settings.phone}</p>
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {theme === 'dark' ? 'حالت تاریک' : 'حالت روشن'}
                </span>
                <div className={cn(
                  'w-14 h-8 rounded-full transition-colors relative flex items-center px-1',
                  theme === 'dark' ? 'bg-brand-600' : 'bg-zinc-300'
                )}>
                  <div className={cn(
                    'w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform',
                    theme === 'dark' ? '-translate-x-6' : 'translate-x-0'
                  )}>
                    {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-brand-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                </div>
              </button>
            </div>

            {/* Contact */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-center gap-4">
                {settings.phone && (
                  <a
                    href={`tel:${settings.phone}`}
                    title={`تلفن کافه: ${settings.phone}`}
                    className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-green-500 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
              <p className="text-center text-xs text-zinc-400 mt-3">نسخه ۱.۰.۰</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
