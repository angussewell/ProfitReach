'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  console.log('[NextAuth] Error page params:', searchParams);

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md p-6 space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            There was a problem authenticating with HubSpot.
            {searchParams.error && (
              <div className="mt-2">
                Error: {searchParams.error}
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This could be due to:
          </p>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-2">
            <li>Invalid or expired OAuth token</li>
            <li>Missing or incorrect permissions</li>
            <li>HubSpot service interruption</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/auth/signin">
              Try Again
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
} 