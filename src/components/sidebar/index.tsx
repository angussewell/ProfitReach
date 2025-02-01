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

interface Route {
  href: string;
  label: string;
  icon: React.ReactElement;
}

const createIcon = (Icon: LucideIcon, key: string) => 
  React.createElement(Icon, { 
    className: "h-5 w-5 flex-shrink-0 text-muted-foreground",
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
      icon: createIcon(Icons.Settings, 'manage-scenarios-icon')
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
      icon: createIcon(Icons.MessageSquare, 'prompts-icon')
    },
    { 
      href: '/webhook-logs', 
      label: 'Webhook Logs', 
      icon: createIcon(Icons.Webhook, 'webhook-logs-icon')
    },
    { 
      href: '/research', 
      label: 'Research', 
      icon: createIcon(Icons.Search, 'research-icon')
    },
    { 
      href: '/settings', 
      label: 'Settings', 
      icon: createIcon(Icons.Settings, 'settings-icon')
    }
  ];

  return (
    <SidebarContainer open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between">
        <div className="flex flex-col flex-1">
          {/* Organization Switcher */}
          <div className="p-3 border-b border-border">
            <OrganizationSwitcher open={open} />
          </div>

          <nav className="flex-1 py-2 space-y-0.5">
            {routes.map((route) => (
              <SidebarLink
                key={route.href}
                link={route}
                className={cn(
                  "px-3 py-2 mx-2 rounded-lg transition-colors",
                  pathname === route.href 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  !currentOrganization && "opacity-50 pointer-events-none"
                )}
              />
            ))}
          </nav>
        </div>

        {/* Status Bar */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={cn(
              "h-2 w-2 rounded-full",
              currentOrganization 
                ? "bg-primary animate-pulse" 
                : "bg-muted-foreground/30"
            )} />
            <motion.span
              animate={{
                display: open ? "inline-block" : "none",
                opacity: open ? 1 : 0,
              }}
              className="font-mono whitespace-pre"
            >
              {currentOrganization ? 'Connected' : 'No Organization'}
            </motion.span>
          </div>
        </div>
      </SidebarBody>
    </SidebarContainer>
  );
} 