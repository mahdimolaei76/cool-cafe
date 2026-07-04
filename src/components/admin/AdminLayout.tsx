import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Coffee, FolderOpen, ClipboardList, DollarSign,
  BarChart3, Settings, Menu, X, Sun, Moon, ChevronLeft, ExternalLink, QrCode, LogOut, User
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store';
import { useAuthStore } from '@/store/authStore';

// منوی Admin
const adminNavItems = [
  { path: '/admin', label: 'داشبورد', icon: LayoutDashboard, exact: true, roles: ['admin'] },
  { path: '/admin/menu', label: 'منو', icon: Coffee, roles: ['admin'] },
  { path: '/admin/categories', label: 'دسته‌بندی‌ها', icon: FolderOpen, roles: ['admin'] },
  { path: '/admin/orders', label: 'همه سفارش‌ها', icon: ClipboardList, roles: ['admin'], badge: true },
  { path: '/admin/sales', label: 'فروش', icon: DollarSign, roles: ['admin'] },
  { path: '/admin/reports', label: 'گزارش‌ها', icon: BarChart3, roles: ['admin'] },
  { path: '/admin/qr-code', label: 'کد QR', icon: QrCode, roles: ['admin'] },
  { path: '/admin/settings', label: 'تنظیمات', icon: Settings, roles: ['admin'] },
];

// منوی Cashier
const cashierNavItems = [
  { path: '/cashier', label: 'سفارش جدید', icon: ClipboardList, exact: true },
  { path: '/cashier/orders', label: 'سفارش‌ها', icon: ClipboardList, badge: true },
  { path: '/cashier/dashboard', label: 'گزارش روزانه', icon: BarChart3 },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, orders: rawOrders } = useAppStore();
  const { user, logout } = useAuthStore();
  const orders = rawOrders ?? [];

  const isCashier = user?.role === 'cashier';
  const navItems = isCashier ? cashierNavItems : adminNavItems;

  const pendingOrdersCount = orders?.filter(o => ['pending', 'preparing'].includes(o.status))?.length;
  const activeOrdersCount = orders?.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))?.length;

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile Header - بزرگتر برای cashier */}
      <div className={cn(
        "lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800",
        isCashier && "bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-900"
      )}>
        <div className="flex items-center justify-between px-4 h-16">
          <button onClick={() => setSidebarOpen(true)} className="p-3 -mr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative">
            <Menu className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            {isCashier && activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-bold text-lg",
              isCashier ? "text-brand-800 dark:text-brand-400" : "text-zinc-900 dark:text-zinc-100"
            )}>
              {isCashier ? 'صندوق' : 'COOL'}
            </span>
            {isCashier && (
              <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400 text-xs font-bold rounded-full">
                {user?.name}
              </span>
            )}
          </div>
          <button onClick={toggleTheme} className="p-2.5 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-zinc-400" /> : <Moon className="w-5 h-5 text-zinc-400" />}
          </button>
        </div>
        {/* نمایش سریع سفارش‌های فعال برای cashier */}
        {isCashier && activeOrdersCount > 0 && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <div className="flex-shrink-0 px-3 py-1.5 bg-brand-600 text-white rounded-full text-xs font-bold">
                {pendingOrdersCount} در انتظار
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                {orders?.filter(o => o.status === 'preparing')?.length} در حال آماده‌سازی
              </div>
              <div className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold">
                {orders?.filter(o => o.status === 'ready')?.length} آماده
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: 280 }} animate={{ x: 0 }} exit={{ x: 280 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute right-0 top-0 bottom-0 w-[300px]">
              <SidebarContent
                onClose={() => setSidebarOpen(false)}
                isActive={isActive}
                theme={theme}
                toggleTheme={toggleTheme}
                user={user}
                onLogout={handleLogout}
                navItems={navItems}
                pendingOrdersCount={pendingOrdersCount}
                activeOrdersCount={activeOrdersCount}
                isCashier={isCashier}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-[280px] z-30">
        <SidebarContent
          isActive={isActive}
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          navItems={navItems}
          pendingOrdersCount={pendingOrdersCount}
          activeOrdersCount={activeOrdersCount}
          isCashier={isCashier}
        />
      </div>

      {/* Main Content */}
      <main className="lg:mr-[280px] min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  onClose,
  isActive,
  theme,
  toggleTheme,
  user,
  onLogout,
  navItems,
  pendingOrdersCount,
  activeOrdersCount,
  isCashier,
}: {
  onClose?: () => void;
  isActive: (path: string, exact?: boolean) => boolean;
  theme: string;
  toggleTheme: () => void;
  user: { name: string; role: string; username: string; } | null;
  onLogout: () => void;
  navItems: any[];
  pendingOrdersCount: number;
  activeOrdersCount: number;
  isCashier: boolean;
}) {
  return (
    <div className={cn(
      "h-full bg-white dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800 flex flex-col",
      isCashier && "border-l-4 border-l-brand-500"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-between px-6",
        isCashier ? "h-20 bg-gradient-to-r from-brand-600 to-brand-700" : "h-16 border-b border-zinc-100 dark:border-zinc-800"
      )}>
        <Link to={isCashier ? "/cashier" : "/admin"} className="flex items-center gap-3" onClick={onClose}>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
            isCashier ? "bg-white text-brand-600" : "bg-gradient-to-br from-brand-600 to-brand-800 text-white"
          )}>
            <span className="font-serif font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>C</span>
          </div>
          <div>
            <span className={cn(
              "font-bold block",
              isCashier ? "text-white text-lg" : "text-zinc-900 dark:text-zinc-100"
            )}>
              {isCashier ? 'صندوق' : 'کافه COOL'}
            </span>
            <span className={cn(
              "text-xs",
              isCashier ? "text-white/80" : "text-zinc-400"
            )}>
              {isCashier ? 'پنل صندوق‌دار' : 'پنل مدیریت'}
            </span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className={cn(
            "p-2 rounded-xl transition-colors lg:hidden",
            isCashier ? "hover:bg-white/20 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
          )}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            isCashier
              ? "bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800"
              : "bg-zinc-50 dark:bg-zinc-800/50"
          )}>
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center",
              isCashier
                ? "bg-brand-600 text-white"
                : "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
            )}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
              <p className={cn(
                "text-xs",
                isCashier ? "text-brand-600 dark:text-brand-400 font-medium" : "text-zinc-400"
              )}>
                {user.role === 'admin' ? 'مدیر سیستم' : 'صندوق‌دار'}
              </p>
            </div>
            {isCashier && activeOrdersCount > 0 && (
              <span className="w-6 h-6 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nav - کشیر: آیتم‌های بزرگ و بولد */}
      <nav className={cn(
        "flex-1 overflow-y-auto",
        isCashier ? "py-6 px-4 space-y-3" : "py-4 px-3 space-y-1"
      )}>
        {navItems?.map(item => {
          const active = isActive(item.path, item.exact);
          const showBadge = item.badge && (
            isCashier ? activeOrdersCount > 0 : pendingOrdersCount > 0
          );
          const badgeCount = isCashier ? activeOrdersCount : pendingOrdersCount;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center gap-4 transition-all duration-200',
                isCashier
                  ? cn(
                    'px-5 py-4 rounded-2xl text-base font-bold',
                    active
                      ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/30 scale-105'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-2 border-zinc-200 dark:border-zinc-700'
                  )
                  : cn(
                    'px-4 py-3 rounded-xl text-sm font-medium',
                    active
                      ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                  )
              )}
            >
              <item.icon className={cn(
                isCashier ? 'w-6 h-6' : 'w-5 h-5',
                active ? (isCashier ? 'text-white' : 'text-brand-700 dark:text-brand-400') : 'text-zinc-400'
              )} />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className={cn(
                  'px-2.5 py-1 text-xs font-black rounded-full',
                  active && isCashier
                    ? 'bg-white text-brand-600'
                    : 'bg-brand-600 text-white',
                  isCashier && 'animate-pulse'
                )}>
                  {badgeCount}
                </span>
              )}
              {active && !isCashier && <ChevronLeft className="w-4 h-4 text-brand-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
        {!isCashier && (
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 w-full transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-zinc-400" /> : <Moon className="w-5 h-5 text-zinc-400" />}
            {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
          </button>
        )}

        {!isCashier && (
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800 w-full transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-zinc-400" />
            مشاهده منو
          </Link>
        )}

        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full transition-colors",
            isCashier
              ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          )}
        >
          <LogOut className="w-5 h-5" />
          خروج
        </button>
      </div>
    </div>
  );
}
