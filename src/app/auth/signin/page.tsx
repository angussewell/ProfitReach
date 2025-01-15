'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('Session authenticated, redirecting to dashboard');
      router.push('/');
    }
  }, [session, status, router]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      
      const result = await signIn('hubspot', { 
        redirect: true,
        callbackUrl: '/'
      });
      
      // This code will only run if redirect is set to false
      if (result?.error) {
        setError(result.error);
        router.push(`/auth/error?error=${encodeURIComponent(result.error)}`);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (status === 'loading' || isSigningIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff7a59]"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f8fa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center">
          <Image
            src="/hubspot-logo-full.svg"
            alt="HubSpot"
            width={200}
            height={60}
            className="mx-auto mb-8"
            priority
          />
          <div className="hs-card">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <h2 className="text-[#2d3e50] text-2xl font-semibold mb-2">
              Campaign Performance Dashboard
            </h2>
            <p className="text-[#516f90] text-sm mb-8">
              Connect your HubSpot account to view your outbound campaign metrics
            </p>
            
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="hs-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0.556641 9.07227H23.4447V0.181641H0.556641V9.07227ZM0.556641 23.8164H23.4447V14.9258H0.556641V23.8164Z" />
              </svg>
              {isSigningIn ? 'Connecting...' : 'Connect with HubSpot'}
            </button>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-[#516f90]">
                By connecting, you agree to allow this dashboard to access your HubSpot campaign data
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-[#516f90]">
        <p>© {new Date().getFullYear()} HubSpot Campaign Dashboard. All rights reserved.</p>
      </footer>
    </div>
  );
} 