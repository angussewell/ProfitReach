'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';

export default function Overview() {
  const handleConnect = async () => {
    console.log('Starting auth...');
    try {
      const result = await signIn('gohighlevel', { 
        callbackUrl: '/settings/scenarios',
        redirect: true
      });
      console.log('Auth result:', result);
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Connect Your GoHighLevel Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Get started by connecting your GoHighLevel account to enable automated outreach campaigns.
          </p>
          <Button onClick={handleConnect}>
            Connect GoHighLevel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 