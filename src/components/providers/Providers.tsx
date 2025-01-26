'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
  session?: any;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={0}>
      <OrganizationProvider>
        {children}
        <Toaster position="top-right" />
      </OrganizationProvider>
    </SessionProvider>
  );
} 