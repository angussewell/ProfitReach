import './globals.css';
import { Lexend } from 'next/font/google';
import AppSidebar from '@/components/layout/AppSidebar';
import { HomeIcon, ListIcon, ClockIcon } from 'lucide-react';
import { SidebarLink } from '@/components/ui/sidebar';

const lexend = Lexend({ subsets: ['latin'] });

export const metadata = {
  title: 'HubSpot Dashboard',
  description: 'A modern dashboard for managing HubSpot contacts and sequences',
};

const navigationItems = [
  { label: 'Dashboard', href: '/', icon: <HomeIcon /> },
  { label: 'All Scenarios', href: '/scenarios', icon: <ListIcon /> },
  { label: 'Current Scenarios', href: '/scenarios/current', icon: <ClockIcon /> },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lexend.className}>
      <body className="page-gradient antialiased min-h-screen">
        <div className="flex min-h-screen">
          <div className="flex-shrink-0 h-screen sticky top-0">
            <AppSidebar>
              <nav className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <SidebarLink key={item.label} link={item} />
                ))}
              </nav>
            </AppSidebar>
          </div>
          <div className="flex-1 flex flex-col min-h-screen">
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
