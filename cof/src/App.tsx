import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAppStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import PublicMenu from '@/pages/PublicMenu';
import OrderTracking from '@/pages/OrderTracking';
import AboutPage from '@/pages/AboutPage';
import LoginPage from '@/pages/admin/LoginPage';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import Dashboard from '@/pages/admin/Dashboard';
import MenuManagement from '@/pages/admin/MenuManagement';
import CategoryManagement from '@/pages/admin/CategoryManagement';
import OrderManagement from '@/pages/admin/OrderManagement';
import NewOrder from '@/pages/admin/NewOrder';
import CustomerManagement from '@/pages/admin/CustomerManagement';
import CashierOrders from '@/pages/cashier/CashierOrders';
import CashierDashboard from '@/pages/cashier/CashierDashboard';
import CashierCreditManagement from '@/pages/cashier/CashierCreditManagement';
import Sales from '@/pages/admin/Sales';
import Reports from '@/pages/admin/Reports';
import QRCodePage from '@/pages/admin/QRCodePage';
import SettingsPage from '@/pages/admin/SettingsPage';

export default function App() {
  const { theme, fetchCategories, fetchMenuItems, fetchOrders, fetchSettings } = useAppStore();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);
  // Fetch public data from API on mount (falls back to localStorage cache if offline)
  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
    fetchSettings();
  }, [fetchCategories, fetchMenuItems, fetchSettings]);

  // GET /orders requires staff auth, so only fetch it once a cashier/admin
  // is actually logged in — otherwise every anonymous visitor to the
  // public menu or tracking page triggers a guaranteed 401 in the background.
  useEffect(() => {
    if (isAuthenticated) fetchOrders();
  }, [isAuthenticated, fetchOrders]);

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        dir="rtl"
        gap={8}
        offset={20}
        mobileOffset={16}
        className="!z-[9999]"
        richColors
        closeButton
        toastOptions={{
          duration: 3500,
          style: {
            background: theme === 'dark' ? '#27272a' : '#ffffff',
            color: theme === 'dark' ? '#f4f4f5' : '#18181b',
            border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7',
            borderRadius: '14px',
            maxWidth: '360px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'inherit',
            boxShadow: theme === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.5)'
              : '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<PublicMenu />} />
        <Route path="/track" element={<OrderTracking />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Cashier */}
        <Route path="/cashier" element={<ProtectedRoute roles={['cashier', 'admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<NewOrder />} />
          <Route path="orders" element={<CashierOrders />} />
          <Route path="credit" element={<CashierCreditManagement />} />
          <Route path="dashboard" element={<CashierDashboard />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="sales" element={<Sales />} />
          <Route path="reports" element={<Reports />} />
          <Route path="qr-code" element={<QRCodePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
