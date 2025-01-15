'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f8fa] px-4">
      <div className="max-w-md w-full">
        <div className="hs-card text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          
          <h2 className="mt-4 text-xl font-semibold text-[#2d3e50]">
            Authentication Error
          </h2>
          
          <p className="mt-2 text-[#516f90]">
            {error === 'AccessDenied'
              ? 'Access was denied to your HubSpot account. Please try again and make sure to approve the requested permissions.'
              : 'There was an error connecting to HubSpot. Please try again.'}
          </p>

          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="hs-button-primary inline-flex items-center"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 