'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutGrid, 
  Settings, 
  MessageSquare, 
  Webhook, 
  FileText,
  Search,
  Briefcase,
  LogOut,
  User
} from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher';
import { Suspense } from 'react';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

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