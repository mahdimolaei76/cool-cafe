import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAppStore } from '@/store';
import PublicMenu from '@/pages/PublicMenu';
import LoginPage from '@/pages/admin/LoginPage';
import AdminLayout from '@/components/admin/AdminLayout';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import Dashboard from '@/pages/admin/Dashboard';
import MenuManagement from '@/pages/admin/MenuManagement';
import CategoryManagement from '@/pages/admin/CategoryManagement';
import OrderManagement from '@/pages/admin/OrderManagement';
import NewOrder from '@/pages/admin/NewOrder';
import CashierOrders from '@/pages/cashier/CashierOrders';
import CashierDashboard from '@/pages/cashier/CashierDashboard';
import Sales from '@/pages/admin/Sales';
import Reports from '@/pages/admin/Reports';
import QRCodePage from '@/pages/admin/QRCodePage';
import SettingsPage from '@/pages/admin/SettingsPage';

export default function App() {
  const { theme, fetchCategories, fetchMenuItems, fetchOrders } = useAppStore();

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);
  // Fetch data from API on mount (falls back to localStorage cache if offline)
  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
    fetchOrders();
  }, [fetchCategories, fetchMenuItems, fetchOrders]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { background: theme === 'dark' ? '#27272a' : '#fff', color: theme === 'dark' ? '#f4f4f5' : '#18181b', border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7', borderRadius: '12px' } }} />
      <Routes>
        <Route path="/" element={<PublicMenu />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Cashier */}
        <Route path="/cashier" element={<ProtectedRoute roles={['cashier', 'admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<NewOrder />} />
          <Route path="orders" element={<CashierOrders />} />
          <Route path="dashboard" element={<CashierDashboard />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="orders" element={<OrderManagement />} />
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
