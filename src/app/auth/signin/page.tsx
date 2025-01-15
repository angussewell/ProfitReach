'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSignIn = async () => {
    try {
      const result = await signIn('hubspot', {
        callbackUrl,
        redirect: true,
      });
      
      if (result?.error) {
        console.error('Sign in error:', result.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src="/hubspot-logo.png"
            alt="HubSpot Logo"
            width={150}
            height={40}
            priority
          />
          <h1 className="text-2xl font-bold text-center">
            Sign in to HubSpot Dashboard
          </h1>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error === 'OAuthCallback'
                ? 'There was a problem signing in with HubSpot. Please try again.'
                : error}
            </div>
          )}
        </div>

        <Button
          className="w-full py-6 text-lg"
          onClick={handleSignIn}
        >
          Continue with HubSpot
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By signing in, you agree to allow this dashboard to access your HubSpot data
        </p>
      </Card>
    </div>
  );
} 