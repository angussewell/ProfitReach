'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import CreateContactButton from '@/components/contacts/CreateContactButton';
import ImportContactsButton from '@/components/contacts/ImportContactsButton';
import { FilterState } from '@/types/filters';
import FilterBar from '@/components/filters/FilterBar';
import SavedFiltersTabs from '@/components/filters/SavedFiltersTabs';
import EnhancedContactsTable from './enhanced-contacts-table';
import SearchBar from '@/components/contacts/SearchBar';
import { useOrganization } from '@/contexts/OrganizationContext';

// Loading state component
function ContactsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="divide-y">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-5 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error component
function ContactsError({ error }: { error: Error | string }) {
  const errorMessage = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-medium text-red-800">Error loading contacts</h3>
      <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
    </div>
  );
}

interface ContactsPageClientProps {
  initialOrganizationId?: string;
  // Serialized search params from the server
  searchParams: {
    filters?: string;
    search?: string;
  };
}

export default function ContactsPageClient({ initialOrganizationId, searchParams }: ContactsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  
  // State for contact data
  const [contacts, setContacts] = useState<any[]>([]);
  const [totalMatchingCount, setTotalMatchingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams?.search || '';
  });
  
  // State to manage the filter state passed down to FilterBar
  const [currentFilterState, setCurrentFilterState] = useState<FilterState | null>(() => {
    // Initialize from URL search params on initial render
    const filtersParam = searchParams?.filters;
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam));
      } catch {
        return null;
      }
    }
    return null;
  });

  // State to trigger refresh of SavedFiltersTabs
  const [refreshTabsCounter, setRefreshTabsCounter] = useState(0);
  // State to track the currently selected filter (for update mode)
  const [selectedFilter, setSelectedFilter] = useState<{id: string; name: string} | null>(null);

  // Fetch contacts based on filter state and search term
  const fetchContacts = useCallback(async (filterState: FilterState | null, search?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construct the URL with filters and search if they exist
      let url = '/api/contacts/list';
      const params = new URLSearchParams();
      
      if (filterState) {
        const filterJson = JSON.stringify(filterState);
        params.append('filters', filterJson);
      }
      
      if (search && search.trim() !== '') {
        params.append('search', search.trim());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching contacts from URL:', url);
      const response = await fetch(url);
      const result = await response.json();
      
      console.log('Contacts API response:', {
        status: response.status,
        success: result.success,
        totalCount: result.totalCount,
        dataLength: result.data?.length || 0
      });
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch contacts');
      }
      
      // Correctly access nested data property from createApiResponse structure
      const responseData = result.data; 
      console.log('Setting contacts state with data:', responseData?.data?.length || 0, 'items');
      setContacts(responseData?.data || []); 
      setTotalMatchingCount(responseData?.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'An error occurred while fetching contacts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search term changes
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    // Update URL to include search term
    const params = new URLSearchParams(currentSearchParams.toString());
    if (term.trim() !== '') {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    
    // Update the URL without reloading the page
    router.replace(`${pathname}?${params.toString()}`);
    
    // Fetch contacts with the current filter state and new search term
    fetchContacts(currentFilterState, term);
  }, [currentFilterState, router, pathname, currentSearchParams, fetchContacts]);

  // Callback for when a saved filter tab is selected
  const handleSelectFilter = useCallback((filterState: FilterState | null) => {
    setCurrentFilterState(filterState); // Update the state passed to FilterBar

    // Update URL to reflect the selected filter (or clear it) while preserving search
    const params = new URLSearchParams(currentSearchParams.toString());
    if (filterState) {
      params.set('filters', encodeURIComponent(JSON.stringify(filterState)));
    } else {
      params.delete('filters');
    }
    
    // Update the URL (this triggers a re-render but doesn't reload the page)
    router.replace(`${pathname}?${params.toString()}`);
    
    // Fetch contacts with the new filter state and current search term
    fetchContacts(filterState, searchTerm);
  }, [router, pathname, currentSearchParams, fetchContacts, searchTerm]);

  // Callback for when a new filter is saved via the modal in FilterBar
  const handleSaveFilterSuccess = useCallback(() => {
    setRefreshTabsCounter(prev => prev + 1); // Increment counter to trigger tab refresh
  }, []);

  // Get current organization
  const { currentOrganization } = useOrganization();
  
  // Log organization info for debugging
  useEffect(() => {
    console.log('Current organization in ContactsPageClient:', currentOrganization);
  }, [currentOrganization]);
  
  // Initial data fetch and setup effect - add currentOrganization to dependencies
  useEffect(() => {
    if (currentOrganization) {
      console.log(`Fetching contacts for organization: ${currentOrganization.name} (${currentOrganization.id})`);
      fetchContacts(currentFilterState, searchTerm);
    } else {
      console.log('No current organization, waiting before fetching contacts');
    }
  }, [currentFilterState, searchTerm, fetchContacts, currentOrganization]);

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
        <div className="flex space-x-2">
          <ImportContactsButton />
          <CreateContactButton />
        </div>
      </div>

      {/* Saved Filters Tabs */}
      <SavedFiltersTabs 
        onSelectFilter={handleSelectFilter} 
        refreshCounter={refreshTabsCounter}
        onFilterSelect={(filterId, filterName) => {
          setSelectedFilter(filterId && filterName ? { id: filterId, name: filterName } : null);
        }}
      />

      <div className="flex flex-col gap-4">
        {/* Global Search */}
        <div className="mb-2">
          <SearchBar 
            onSearch={handleSearch}
            initialValue={searchTerm}
            placeholder="Search by name, email, title, company..."
          />
        </div>
        
        {/* Filter Bar - controlled by parent state */}
        <FilterBar 
          initialFilterState={currentFilterState} 
          onSaveFilterSuccess={handleSaveFilterSuccess}
          // Pass selected filter info for update mode
          selectedFilterId={selectedFilter?.id}
          selectedFilterName={selectedFilter?.name}
          // Optional: handle filter changes within the bar
          onFiltersChange={(filters) => {
            setCurrentFilterState(filters);
            // Update URL without refreshing
            const params = new URLSearchParams(currentSearchParams.toString());
            params.set('filters', encodeURIComponent(JSON.stringify(filters)));
            router.replace(`${pathname}?${params.toString()}`);
            // Fetch with new filters and preserve search term
            fetchContacts(filters, searchTerm);
          }}
        />
      </div>
      
      {/* Contacts Table */}
      {isLoading ? (
        <ContactsTableSkeleton />
      ) : error ? (
        <ContactsError error={error} />
      ) : (
        <EnhancedContactsTable 
          contacts={contacts} 
          totalMatchingCount={totalMatchingCount}
          currentFilterState={currentFilterState}
          searchTerm={searchTerm}
        />
      )}
    </PageContainer>
  );
}
