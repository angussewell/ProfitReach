'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppSidebar from '@/components/layout/AppSidebar';
import Link from 'next/link';
import { 
  LayoutGrid, 
  Settings, 
  MessageSquare, 
  Webhook, 
  FileText,
  Search,
  Briefcase
} from 'lucide-react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navigationItems = [
    { href: '/scenarios', label: 'All Scenarios', icon: LayoutGrid },
    { href: '/scenarios/manage', label: 'Manage Scenarios', icon: Briefcase },
    { href: '/research', label: 'Research', icon: Search },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/webhooks', label: 'Webhooks', icon: Webhook },
    { href: '/prompts', label: 'Prompts', icon: MessageSquare },
    { href: '/snippets', label: 'Snippets', icon: FileText },
  ];

  return (
    <div className="flex min-h-screen">
      <AppSidebar>
        <nav className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </AppSidebar>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 