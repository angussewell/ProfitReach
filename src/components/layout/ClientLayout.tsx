'use client';

import { Suspense } from 'react';
import Sidebar from '@/components/sidebar';
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher';

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  organizationId?: string | null;
}

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User;
}

export function ClientLayout({ children, user }: ClientLayoutProps) {
  return (
    <div className="flex h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <Suspense fallback={<div>Loading...</div>}>
              <OrganizationSwitcher />
            </Suspense>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
} 