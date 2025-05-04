import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar'; // Adjust path if needed

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Page content will be rendered here */}
        {children}
      </main>
    </div>
  );
}
