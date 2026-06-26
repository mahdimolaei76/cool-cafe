import AdminLayout from '@/components/admin/AdminLayout';

// Cashier uses the same layout but with different nav items
// The AdminLayout component already handles role-based navigation
export default function CashierLayout() {
  return <AdminLayout />;
}
