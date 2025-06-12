'use client';

import { useSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function GHLAuthButton() {
  const { data: session } = useSession();

  const handleConnect = async () => {
    if (!session?.user?.organizationId) {
      console.error('No organization ID found in session');
      return;
    }

    try {
      await signIn('gohighlevel', { 
        callbackUrl: '/settings/scenarios',
        redirect: true
      });
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
<Button
  onClick={handleConnect}
  variant="default"
  size="default"
  disabled={!session?.user?.organizationId}
>
  Connect GoHighLevel
    </Button>
  );
}
