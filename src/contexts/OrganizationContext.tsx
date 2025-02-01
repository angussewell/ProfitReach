'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

  // Fetch organizations and current organization
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all organizations
        const orgRes = await fetch('/api/organizations');
        if (!orgRes.ok) throw new Error('Failed to fetch organizations');
        const orgs = await orgRes.json();
        setOrganizations(orgs);

        // If we have an organizationId, fetch the current organization
        if (session.user.organizationId) {
          const currentOrgRes = await fetch(`/api/organizations/${session.user.organizationId}`);
          if (currentOrgRes.ok) {
            const currentOrg = await currentOrgRes.json();
            setCurrentOrganization(currentOrg);
          }
        }
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
        setError('Failed to fetch organization data');
        toast.error('Failed to fetch organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id, session?.user?.organizationId]);

  const switchOrganization = async (orgId: string) => {
    if (!orgId || switching) return;
    
    try {
      setSwitching(true);
      setError(null);
      
      // First, find the organization in our current list
      const targetOrg = organizations.find(org => org.id === orgId);
      if (!targetOrg) {
        // Attempt to fetch fresh organization data
        const orgRes = await fetch('/api/organizations');
        if (!orgRes.ok) throw new Error('Failed to fetch organizations');
        const orgs = await orgRes.json();
        setOrganizations(orgs);
        
        // Try to find the organization again
        const freshTargetOrg = orgs.find((org: Organization) => org.id === orgId);
        if (!freshTargetOrg) {
          throw new Error('Organization not found');
        }
      }

      // Make the API call to switch organizations
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to switch organization');
      }

      const data = await res.json();

      // Update session with new organization ID
      await updateSession({
        organizationId: data.organizationId
      });

      // Show feedback
      toast.success(`Switching to ${targetOrg?.name || 'new organization'}...`);

      // Force a full page refresh to get fresh server-side data
      window.location.href = '/scenarios';
    } catch (err) {
      console.error('Failed to switch organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      toast.error(err instanceof Error ? err.message : 'Failed to switch organization');
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

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        loading,
        switching,
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