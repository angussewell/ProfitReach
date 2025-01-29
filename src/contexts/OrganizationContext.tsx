'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const currentOrganization = organizations.find(
    org => org.id === session?.user?.organizationId
  ) || null;

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/organizations');
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch organizations');
        }
        
        setOrganizations(data);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setError('Failed to fetch organizations');
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchOrganizations();
    }
  }, [session]);

  const switchOrganization = async (orgId: string) => {
    try {
      setError(null);
      setSwitching(true);
      console.log('Starting organization switch to:', orgId);
      
      // First verify the organization exists
      const verifyRes = await fetch(`/api/organizations?id=${orgId}`);
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok || !verifyData) {
        console.error('Organization verification failed:', verifyData);
        throw new Error('Invalid organization ID');
      }

      // Perform the switch
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ organizationId: orgId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Switch organization response error:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        });
        throw new Error(errorData.error || 'Failed to switch organization');
      }

      const data = await res.json();
      console.log('Switch organization success:', data);

      // Update session with proper trigger
      await updateSession({
        ...data,
        trigger: 'update'
      });
      
      // Wait for a short delay to ensure JWT callback completes
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`Switched to ${data.organizationName}`);
      
      // Use Next.js router instead of window.location
      router.push('/scenarios');
      router.refresh();
    } catch (err) {
      console.error('Organization switch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      toast.error(err instanceof Error ? err.message : 'Failed to switch organization');
      throw err;
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }
      
      // Refresh organizations list
      const orgsRes = await fetch('/api/organizations');
      const orgsData = await orgsRes.json();
      
      if (!orgsRes.ok) {
        throw new Error(orgsData.error || 'Failed to fetch organizations');
      }
      
      setOrganizations(orgsData);
      toast.success('Organization created successfully');
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      toast.error(err instanceof Error ? err.message : 'Failed to create organization');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        loading,
        error,
        switchOrganization,
        createOrganization
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