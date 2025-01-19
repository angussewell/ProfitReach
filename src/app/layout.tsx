import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { HomeIcon, ListIcon, Settings, MessageSquare, Sparkles, ScrollText } from 'lucide-react';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarLink } from '@/components/ui/sidebar';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HubSpot Dashboard',
  description: 'Monitor and manage your HubSpot data',
};

const navigationItems = [
  { label: 'Dashboard', href: '/', icon: <HomeIcon /> },
  { label: 'All Scenarios', href: '/scenarios', icon: <ListIcon /> },
  { label: 'Manage Scenarios', href: '/settings/scenarios', icon: <Settings /> },
  { label: 'Email Signatures', href: '/signatures', icon: <MessageSquare /> },
  { label: 'Prompts', href: '/prompts', icon: <Sparkles /> },
  { label: 'Webhook Logs', href: '/logs', icon: <ScrollText /> },
  { label: 'Settings', href: '/settings', icon: <Settings /> }
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} page-gradient antialiased min-h-screen`}>
        <div className="flex h-screen overflow-hidden">
          <div className="flex-shrink-0 h-screen sticky top-0">
            <AppSidebar>
              <div className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    link={{
                      label: item.label,
                      href: item.href,
                      icon: item.icon
                    }}
                  />
                ))}
              </div>
            </AppSidebar>
          </div>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
