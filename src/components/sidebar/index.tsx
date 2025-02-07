'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import * as Icons from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import OrganizationSwitcher from '@/components/organization/OrganizationSwitcher';
import { cn } from '@/lib/utils';
import { Sidebar as SidebarContainer, SidebarBody, SidebarLink } from '../ui/sidebar';
import { useState } from 'react';
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';

interface Route {
  href: string;
  label: string;
  icon: React.ReactElement;
  adminOnly?: boolean;
}

const createIcon = (Icon: LucideIcon, key: string) => 
  React.createElement(Icon, { 
    className: "h-[22px] w-[22px] flex-shrink-0 text-slate-400 transition-all duration-200 group-hover:text-red-600 group-[.active]:text-red-600 group-hover:scale-110 group-[.active]:scale-110",
    key
  });

export default function Sidebar(): JSX.Element {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { currentOrganization, loading } = useOrganization();
  const [open, setOpen] = useState(true);

  const routes: Route[] = [
    { 
      href: '/scenarios', 
      label: 'Scenarios', 
      icon: createIcon(Icons.LayoutGrid, 'scenarios-icon')
    },
    { 
      href: '/settings/scenarios', 
      label: 'Manage Scenarios', 
      icon: createIcon(Icons.LayoutList, 'manage-scenarios-icon')
    },
    { 
      href: '/snippets', 
      label: 'Snippets', 
      icon: createIcon(Icons.Code2, 'snippets-icon')
    },
    { 
      href: '/attachments', 
      label: 'Attachments', 
      icon: createIcon(Icons.FileCode, 'attachments-icon')
    },
    { 
      href: '/prompts', 
      label: 'Prompts', 
      icon: createIcon(Icons.MessageSquare, 'prompts-icon'),
      adminOnly: true
    },
    { 
      href: '/webhook-logs', 
      label: 'Webhook Logs', 
      icon: createIcon(Icons.Webhook, 'webhook-logs-icon')
    },
    { 
      href: '/email-accounts', 
      label: 'Email Accounts', 
      icon: createIcon(Icons.Mail, 'email-accounts-icon')
    },
    { 
      href: '/settings', 
      label: 'Settings', 
      icon: createIcon(Icons.Settings, 'settings-icon'),
      adminOnly: true
    }
  ];

  return (
    <SidebarContainer open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between bg-gradient-to-b from-white to-slate-50/80">
        <div className="flex flex-col flex-1">
          {/* Logo */}
          <div className={cn(
            "border-b border-slate-200/50 transition-all duration-200 bg-white/50 backdrop-blur-sm",
            open ? "py-2" : "p-2"
          )}>
            <Logo />
          </div>
          
          {/* Organization Switcher */}
          <div className="px-3 py-2.5 border-b border-slate-200/50 bg-white/30">
            <OrganizationSwitcher open={open} />
          </div>

          <nav className="flex-1 py-2 px-2">
            {routes
              .filter(route => !route.adminOnly || session?.user?.role === 'admin')
              .map((route) => (
                <SidebarLink
                  key={route.href}
                  link={route}
                  className={cn(
                    "px-2.5 py-2.5 mb-0.5 rounded-xl transition-all duration-200 text-base font-medium tracking-[-0.1px] group hover:scale-[1.02] active:scale-[0.98]",
                    pathname === route.href 
                      ? "bg-gradient-to-r from-red-50 to-red-100/50 text-red-600 active shadow-sm ring-1 ring-red-200/50" 
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-200/50",
                    !currentOrganization && "opacity-50 pointer-events-none"
                  )}
                />
              ))}
          </nav>
        </div>

        {/* Status Bar */}
        <div className="px-3 py-2.5 border-t border-slate-200/50 bg-gradient-to-b from-transparent to-white/80">
          <div className="flex items-center gap-2 text-[13.5px] text-slate-500">
            <div className={cn(
              "h-2 w-2 rounded-full shadow-sm ring-1",
              currentOrganization 
                ? "bg-red-500 ring-red-200 animate-pulse" 
                : "bg-slate-300 ring-slate-200"
            )} />
            <motion.span
              animate={{
                display: open ? "inline-block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="font-medium whitespace-pre tracking-[-0.1px]"
            >
              {currentOrganization ? 'Connected' : 'No Organization'}
            </motion.span>
          </div>
        </div>
      </SidebarBody>
    </SidebarContainer>
  );
} 