'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      window.location.href = '/';
    },
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
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
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">ProfitReach</h2>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
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

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              {session?.user?.name || 'User'}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
} 