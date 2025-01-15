'use client';

import { SessionProvider } from 'next-auth/react';
import AuthGuard from '@/components/auth/AuthGuard';
import { usePathname } from 'next/navigation';

const publicPaths = ['/auth/signin'];

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = publicPaths.includes(pathname);

  return (
    <SessionProvider>
      {isPublicPath ? children : <AuthGuard>{children}</AuthGuard>}
    </SessionProvider>
  );
} 