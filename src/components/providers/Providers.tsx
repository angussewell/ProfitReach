'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OrganizationProvider>
        {children}
        <Toaster position="top-right" />
      </OrganizationProvider>
    </SessionProvider>
  );
} 