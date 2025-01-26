'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@/components/login-button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  // Redirect to scenarios if authenticated
  if (status === 'authenticated' && session) {
    router.replace('/scenarios');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Redirecting to dashboard...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ProfitReach</h1>
        <p className="text-lg text-gray-600">Connect with GoHighLevel to get started</p>
      </div>
      <LoginButton />
    </div>
  );
}