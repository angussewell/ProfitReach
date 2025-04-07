import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import React from 'react';
import ContactsPageClient from './ContactsPageClient';

// Simple loading fallback for suspense
function ContactsLoading() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Type definition for the page props
interface ContactsPageProps {
  searchParams: {
    filters?: string;
  };
}

// Page component - now a server component that gets session data and hydrates client
export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  // Get organization info from the server session
  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  // Render the client component with server-fetched data
  return (
    <React.Suspense fallback={<ContactsLoading />}>
      <ContactsPageClient 
        initialOrganizationId={organizationId}
        searchParams={searchParams}
      />
    </React.Suspense>
  );
}
