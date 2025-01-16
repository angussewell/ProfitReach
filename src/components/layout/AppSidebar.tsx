'use client';

import { Sidebar, SidebarProvider, SidebarBody } from '@/components/ui/sidebar';
import { useState } from 'react';

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidebarProvider open={isOpen} setOpen={setIsOpen}>
      <SidebarBody>
        {children}
      </SidebarBody>
    </SidebarProvider>
  );
} 