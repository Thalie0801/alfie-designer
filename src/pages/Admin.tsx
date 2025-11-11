import AdminGuard from '@/components/admin/AdminGuard';
import { AdminScreen } from '@/components/admin/AdminScreen';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminScreen />
    </AdminGuard>
  );
}
