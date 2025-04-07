'use client';

'use client';

import Sidebar from '@/components/sidebar/index';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkflowEditor = pathname?.startsWith('/workflows/new') || pathname?.match(/^\/workflows\/[a-zA-Z0-9-]+(\/edit)?$/);

  // Client-side authentication check removed - handled by middleware

  if (isWorkflowEditor) {
    // Render a minimal layout for the workflow editor
    return (
      <div className="min-h-screen flex flex-col">
        {/* No Sidebar */}
        {/* Main content takes full width and height */}
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    );
  }

  // Render the standard layout with Sidebar
  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />
      {/* Adjusted padding for standard layout */}
      <main className="flex-1 p-4 sm:px-6 sm:py-4">{children}</main>
    </div>
  );
}
