'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LayoutGrid, Settings, MessageSquare, Search, Webhook, Building } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { 
    currentOrganization,
    loading
  } = useOrganization();

  const routes = [
    { href: '/scenarios', label: 'Scenarios', icon: <LayoutGrid size={20} /> },
    { href: '/settings/scenarios', label: 'Manage Scenarios', icon: <Settings size={20} /> },
    { href: '/signatures', label: 'Email Signatures', icon: <MessageSquare size={20} /> },
    { href: '/prompts', label: 'Prompts', icon: <MessageSquare size={20} /> },
    { href: '/webhook-logs', label: 'Webhook Logs', icon: <Webhook size={20} /> },
    { href: '/research', label: 'Research', icon: <Search size={20} /> },
    { href: '/settings', label: 'Settings', icon: <Settings size={20} /> }
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Organization Switcher */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Building size={20} />
          <span className="font-medium">
            {loading ? 'Loading...' : currentOrganization?.name || 'No Organization'}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 ${
              pathname === route.href ? 'bg-gray-100 text-blue-600' : ''
            }`}
          >
            {route.icon}
            <span>{route.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
} 