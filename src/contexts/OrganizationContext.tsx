'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  switching: boolean;
  error: string | null;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  handleLogout: () => Promise<void>;
}

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!session?.user?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        // Use the new route structure with organizationId
        const currentOrgRes = await fetch(`/api/organizations/${session.user.organizationId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!currentOrgRes.ok) {
          throw new Error('Failed to fetch organization');
        }

        const orgData = await currentOrgRes.json();
        setOrganization(orgData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch organization');
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [session?.user?.organizationId]);

  const switchOrganization = async (orgId: string) => {
    if (!orgId || switching) return;
    
    try {
      setSwitching(true);
      setError(null);

      // Make the API call to switch organizations
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to switch organization');
      }

      // Show feedback before session update
      toast.success(`Switching to ${data.organizationName}...`);

      // Update session and wait for it to complete
      await updateSession({
        organizationId: data.organizationId,
        organizationName: data.organizationName
      });

      // Force a full page refresh to get fresh server-side data
      window.location.href = '/scenarios';
    } catch (err) {
      console.error('Failed to switch organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      toast.error(err instanceof Error ? err.message : 'Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  const createOrganization = async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }
      
      // Add the new organization to the list
      setOrganizations(prev => [...prev, data]);
      
      // Switch to the new organization
      await switchOrganization(data.id);
      
      toast.success(`Created organization ${data.name}`);
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      toast.error(err instanceof Error ? err.message : 'Failed to create organization');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Show feedback before logout
      toast.info('Logging out...');
      
      // Clear organization state
      setOrganization(null);
      setOrganizations([]);
      
      // Sign out using NextAuth
      await signOut({ redirect: true, callbackUrl: '/auth/login' });
    } catch (err) {
      console.error('Failed to logout:', err);
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization: organization,
        loading,
        switching,
        error,
        switchOrganization,
        createOrganization,
        handleLogout
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
} 