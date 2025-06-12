'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // Keep for auth check before redirect

// This page now only serves to redirect users to the default admin section
export default function AdminRedirectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Wait for session status to be determined
    if (status === 'loading') {
      return; // Do nothing while loading
    }

    // If unauthenticated, redirect to login (handled by middleware/layout ideally, but good fallback)
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
      return;
    }

    // If authenticated but not admin, redirect away (e.g., to scenarios)
    if (session?.user?.role !== 'admin') {
      router.replace('/scenarios'); // Or another appropriate page
      return;
    }

    // If authenticated admin, redirect to the default analytics page
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      router.replace('/admin/analytics');
    }

  }, [status, session, router]);

  // Render a simple loading state while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Loading Admin Panel...</p>
      {/* Optional: Add a spinner */}
    </div>
  );
}
