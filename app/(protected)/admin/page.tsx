import { getSession } from 'next-auth/react'; // Adjust if using App Router auth helpers
import { redirect } from 'next/navigation';
// Use relative path to potentially fix resolution issue
import AdminViewManager from '../../components/admin/AdminViewManager';

export default async function AdminPage() {
  const session = await getSession(); // Fetch session server-side

  // Check if user is logged in and has ADMIN role (adjust role/property check as needed)
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/login'); // Or your home page, e.g., '/'
  }

  // If the check passes, render the client component
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <AdminViewManager />
    </div>
  );
} 