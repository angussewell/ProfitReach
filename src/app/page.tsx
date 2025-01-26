'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@/components/login-button';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Only redirect if we're on the home page and authenticated
  if (status === 'authenticated') {
    router.replace('/scenarios');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

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