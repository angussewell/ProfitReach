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

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to home if not authenticated
  if (status === 'unauthenticated') {
    router.replace('/');
    return null;
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">ProfitReach</h1>
        </div>
        
        <nav className="space-y-6">
          <div className="space-y-2">
            <Link href="/scenarios" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <LayoutGrid size={20} />
              <span>All Scenarios</span>
            </Link>
            
            <Link href="/settings/scenarios" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <Settings size={20} />
              <span>Manage Scenarios</span>
            </Link>

            <Link href="/prompts" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <MessageSquare size={20} />
              <span>Prompts</span>
            </Link>

            <Link href="/webhooks" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <Webhook size={20} />
              <span>Webhook Logs</span>
            </Link>

            <Link href="/research" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <Search size={20} />
              <span>Research</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
              <div className="flex items-center space-x-2">
                <User size={16} />
                <span>{session?.user?.name || 'User'}</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center space-x-1 text-gray-400 hover:text-white"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-gray-100">
        {children}
      </div>
    </div>
  );
} 