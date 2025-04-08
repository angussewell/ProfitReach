'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { PropsWithChildren, ReactNode } from 'react';
import { StripeProvider } from './StripeProvider';
import { ThemeProvider } from './ThemeProvider'; // Import ThemeProvider

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider> {/* Wrap with ThemeProvider */}
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <OrganizationProvider>
          <StripeProvider>
            {children}
          </StripeProvider>
        </OrganizationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
