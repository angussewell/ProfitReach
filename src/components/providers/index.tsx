'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { PropsWithChildren } from 'react';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </SessionProvider>
  );
} 