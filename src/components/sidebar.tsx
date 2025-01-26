'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutGrid,
  Settings,
  MessageSquare,
  Webhook,
  Search,
  User,
  LogOut,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="w-64 bg-gray-900 text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">ProfitReach</h1>
      </div>
      
      <nav className="space-y-6">
        <div className="space-y-2">
          <Link 
            href="/scenarios" 
            className={`flex items-center space-x-2 text-gray-300 hover:text-white ${
              isActive('/scenarios') ? 'text-white' : ''
            }`}
          >
            <LayoutGrid size={20} />
            <span>All Scenarios</span>
          </Link>
          
          <Link 
            href="/settings/scenarios" 
            className={`flex items-center space-x-2 text-gray-300 hover:text-white ${
              isActive('/settings/scenarios') ? 'text-white' : ''
            }`}
          >
            <Settings size={20} />
            <span>Manage Scenarios</span>
          </Link>

          <Link 
            href="/prompts" 
            className={`flex items-center space-x-2 text-gray-300 hover:text-white ${
              isActive('/prompts') ? 'text-white' : ''
            }`}
          >
            <MessageSquare size={20} />
            <span>Prompts</span>
          </Link>

          <Link 
            href="/webhooks" 
            className={`flex items-center space-x-2 text-gray-300 hover:text-white ${
              isActive('/webhooks') ? 'text-white' : ''
            }`}
          >
            <Webhook size={20} />
            <span>Webhook Logs</span>
          </Link>

          <Link 
            href="/research" 
            className={`flex items-center space-x-2 text-gray-300 hover:text-white ${
              isActive('/research') ? 'text-white' : ''
            }`}
          >
            <Search size={20} />
            <span>Research</span>
          </Link>
        </div>

        <div className="pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <User size={16} />
              <span>Account</span>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex items-center space-x-1 text-gray-400 hover:text-white"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
} 