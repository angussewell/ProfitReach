'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff7a59]"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Show a success message when first authenticated
  const isNewSession = sessionStorage.getItem('newSession') === 'true';
  if (isNewSession) {
    sessionStorage.removeItem('newSession');
    return (
      <div className="min-h-screen bg-[#f5f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-3">
              <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h2 className="text-xl font-semibold text-[#2d3e50]">Successfully connected to HubSpot!</h2>
                <p className="text-[#516f90]">Your HubSpot account is now connected to the dashboard.</p>
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 