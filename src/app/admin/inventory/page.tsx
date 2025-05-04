import React from 'react';
import { ContactsPerOrgStats } from '@/components/admin/ContactsPerOrgStats';
import InventoryPageClientContent from '@/components/admin/InventoryPageClientContent';
// We might need auth checks here server-side eventually, but keep it simple for now.

// Revalidate the page every 60 seconds (ISR)
export const revalidate = 60;

// This is now a Server Component (no 'use client')
export default async function InventoryPage() {

  // Server-side auth/loading checks could go here in the future

  return (
    <div className="space-y-8">
      {/* Page Title (Rendered Server-Side) */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
          System Inventory & Maintenance
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage resources and perform system tasks</p>
      </div>

      {/* Contacts per Organization Section (Server Component) */}
      {/* This component fetches its own data (currently simulated) */}
      <div className="mt-8">
        <ContactsPerOrgStats />
      </div>

      {/* Rest of the page content (Client Component) */}
      {/* This component handles state, effects, user interactions */}
      <InventoryPageClientContent />

    </div>
  );
}
