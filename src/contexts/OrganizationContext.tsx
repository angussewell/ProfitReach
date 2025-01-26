'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { switchOrganization as switchOrganizationAction } from '@/app/actions/switchOrganization';

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
  fetchOrganizations: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOrganization = useMemo(() => {
    const org = organizations.find(org => org.id === session?.user?.organizationId) || null;
    console.log('Current organization computed:', {
      sessionOrgId: session?.user?.organizationId,
      foundOrg: org?.name,
      availableOrgs: organizations.map(o => ({ id: o.id, name: o.name }))
    });
    return org;
  }, [organizations, session?.user?.organizationId]);

  const fetchOrganizations = async () => {
    console.log('Fetching organizations...');
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/organizations');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch organizations');
      }
      
      console.log('Organizations fetched:', data.map((o: Organization) => ({ id: o.id, name: o.name })));
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to fetch organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    if (!orgId || switching) return;
    
    console.log('Starting organization switch to:', orgId);
    try {
      setSwitching(true);
      setError(null);
      
      const updatedUser = await switchOrganizationAction(orgId);
      console.log('Switch successful, updating session with:', updatedUser);
      
      // Update session with new user data
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          ...updatedUser
        }
      });
      
      toast.success(`Switched to ${updatedUser.organizationName}`);
    } catch (err) {
      console.error('Failed to switch organization:', err);
      setError('Failed to switch organization');
      toast.error('Failed to switch organization');
    } finally {
      setSwitching(false);
    }
  };

  const createOrganization = async (name: string) => {
    if (!name) return;
    
    try {
      setError(null);
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      const newOrg = await res.json();
      setOrganizations(prev => [...prev, newOrg]);
      toast.success(`Created organization ${name}`);
      
      // Switch to new organization
      await switchOrganization(newOrg.id);
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError('Failed to create organization');
      toast.error('Failed to create organization');
    }
  };

  useEffect(() => {
    console.log('Session changed:', {
      userId: session?.user?.id,
      orgId: session?.user?.organizationId
    });
    
    if (session?.user) {
      fetchOrganizations();
    }
  }, [session]);

  const value = {
    organizations,
    currentOrganization,
    loading,
    switching,
    error,
    fetchOrganizations,
    switchOrganization,
    createOrganization
  };

  return (
    <OrganizationContext.Provider value={value}>
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