import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminGuard from '@/components/admin/AdminGuard';
import { AdminScreen } from '@/components/admin/AdminScreen';

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminGuard>
        <AdminScreen />
      </AdminGuard>
    </ProtectedRoute>
  );
}
