import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { LayoutDashboard, ListChecks, History } from 'lucide-react';

const links = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />,
  },
  {
    label: 'Current Scenarios',
    href: '/scenarios/current',
    icon: <ListChecks className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />,
  },
  {
    label: 'Past Scenarios',
    href: '/scenarios/past',
    icon: <History className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />,
  },
];

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarBody>
        {links.map((link) => (
          <SidebarLink key={link.href} link={link} />
        ))}
      </SidebarBody>
    </Sidebar>
  );
} 