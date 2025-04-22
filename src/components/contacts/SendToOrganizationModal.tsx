'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { bulkSendContactsToOrg } from '@/lib/server-actions';
import { FilterState } from '@/types/filters';
import { SearchableSelect } from '@/components/ui/searchable-select'; // Assuming this component exists and works
import { ClientButton as Button } from '@/components/ui/client-components'; // Use aliased Button

interface SendToOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactIds: string[];
  isSelectAllMatchingActive?: boolean;
  totalMatchingCount?: number;
  currentFilterState?: FilterState | null;
  searchTerm?: string;
}

interface OrganizationOption {
  value: string; // Organization ID
  label: string; // Organization Name
}

export default function SendToOrganizationModal({
  isOpen,
  onClose,
  contactIds,
  isSelectAllMatchingActive = false,
  totalMatchingCount = 0,
  currentFilterState = null,
  searchTerm = '',
}: SendToOrganizationModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Fetch accessible organizations when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchOrganizations = async () => {
        setIsLoadingOrgs(true);
        setError(null); // Clear previous errors
        try {
          const response = await fetch('/api/organizations/list-accessible');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch organizations');
          }
          const orgs: { id: string; name: string }[] = await response.json();
          setOrganizationOptions(orgs.map(org => ({ value: org.id, label: org.name })));
        } catch (err) {
          console.error('Error fetching organizations:', err);
          setError(err instanceof Error ? err.message : 'Could not load organizations.');
          setOrganizationOptions([]); // Clear options on error
        } finally {
          setIsLoadingOrgs(false);
        }
      };
      fetchOrganizations();
    } else {
      // Reset state when modal closes
      setSelectedOrgId(null);
      setError(null);
      setIsSubmitting(false);
      setOrganizationOptions([]);
    }
  }, [isOpen]);

  // Determine actual contact count based on selection mode
  const effectiveContactCount = isSelectAllMatchingActive ? totalMatchingCount : contactIds.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setError('Please select an organization.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await bulkSendContactsToOrg({
        contactIds: isSelectAllMatchingActive ? undefined : contactIds, // Pass IDs only if not select all
        targetOrganizationId: selectedOrgId,
        isSelectAllMatchingActive,
        filterState: currentFilterState, // Correctly pass the prop value
        searchTerm,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send contacts');
      }

      console.log(`Successfully sent ${result.updatedCount} contacts to organization ${selectedOrgId}`);
      onClose(); // Close modal on success
      router.refresh(); // Refresh the contacts list
    } catch (err) {
      console.error('Error sending contacts to organization:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          Send {effectiveContactCount} {effectiveContactCount === 1 ? 'Contact' : 'Contacts'} to Organization
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="organizationSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Select Target Organization
            </label>
            {/* Removed id prop */}
            <SearchableSelect
              options={organizationOptions}
              // Pass the string ID directly, converting null to undefined
              value={selectedOrgId ?? undefined} 
              // Assume onChange provides the string value directly, or null/undefined if cleared
              onChange={(value: string | null | undefined) => {
                setSelectedOrgId(value ?? null); // Store null if undefined or null
              }}
              placeholder={isLoadingOrgs ? "Loading organizations..." : "Search or select an organization"}
              // Removed isLoading prop
              // Removed isDisabled prop
              // Removed isClearable prop
            />
             {!isLoadingOrgs && organizationOptions.length === 0 && !error && (
                 <p className="mt-1 text-sm text-gray-500">No organizations available to select.</p>
             )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default" // Use default variant for primary action
              disabled={isSubmitting || isLoadingOrgs || !selectedOrgId}
            >
              {isSubmitting ? 'Sending...' : 'Confirm Send'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
