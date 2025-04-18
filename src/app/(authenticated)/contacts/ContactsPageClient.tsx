'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default page size

  // State for search term
  const [searchTerm, setSearchTerm] = useState<string>(() => {
    return searchParams?.search || '';
  });
  
  // Initialize filter state from URL params
  const initialFilterState = (() => {
    const filtersParam = searchParams?.filters;
    if (filtersParam) {
      try {
        return JSON.parse(decodeURIComponent(filtersParam));
      } catch {
        return null;
      }
    }
    return null;
  })();
  
  // Split filter state into draft (what user is editing) and applied (what is used for data fetching)
  const [draftFilterState, setDraftFilterState] = useState<FilterState | null>(initialFilterState);
  const [appliedFilterState, setAppliedFilterState] = useState<FilterState | null>(initialFilterState);
  
  // Track if there are pending changes (draft differs from applied)
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // State to trigger refresh of SavedFiltersTabs
  const [refreshTabsCounter, setRefreshTabsCounter] = useState(0);
  // State to track the currently selected filter (for update mode)
  const [selectedFilter, setSelectedFilter] = useState<{id: string; name: string} | null>(null);

  // Fetch contacts based on filter state, search term, and pagination
  const fetchContacts = useCallback(async (
    filterState: FilterState | null,
    search?: string,
    page: number = currentPage, // Use state as default
    size: number = pageSize     // Use state as default
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Construct the URL with filters and search if they exist
      let url = '/api/contacts/list';
      const params = new URLSearchParams();

      // Add pagination parameters
      params.append('page', String(page));
      params.append('pageSize', String(size));

      if (filterState) {
        const filterJson = JSON.stringify(filterState);
        params.append('filters', filterJson);
      }

      if (search && search.trim() !== '') {
        params.append('search', search.trim());
      }

      url += `?${params.toString()}`;

      console.log(`Fetching contacts from URL: ${url} (Page: ${page}, Size: ${size})`);
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
      // Update pagination state if fetch was for a different page/size
      if (page !== currentPage) setCurrentPage(page);
      if (size !== pageSize) setPageSize(size);

    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message || 'An error occurred while fetching contacts');
    } finally {
      setIsLoading(false);
    }
  // Include currentPage and pageSize in dependencies
  }, [currentPage, pageSize]);

  // Handle search term changes
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to page 1 on new search

    // Update URL to include search term
    const params = new URLSearchParams(currentSearchParams.toString());
    if (term.trim() !== '') {
      params.set('search', term);
    } else {
      params.delete('search');
    }
    
    // Update the URL without reloading the page
    router.replace(`${pathname}?${params.toString()}`);
    // Fetch contacts with the applied filter state, new search term, and reset page
    fetchContacts(appliedFilterState, term, 1); // Fetch page 1
  }, [appliedFilterState, router, pathname, currentSearchParams, fetchContacts]);

  // Helper function to update URL with filters and pagination
  const updateURL = useCallback((filterState: FilterState | null, search: string | null, page: number) => {
    const params = new URLSearchParams(currentSearchParams.toString());

    // Update filters param
    if (filterState) {
      params.set('filters', encodeURIComponent(JSON.stringify(filterState)));
    } else {
      params.delete('filters');
    }

    // Update search param
    if (search && search.trim() !== '') {
      params.set('search', search);
    } else {
      params.delete('search');
    }

    // Update page param (optional: could add pageSize too if needed)
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page'); // Don't show page=1 in URL
    }

    // Update the URL
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, currentSearchParams]);


  // Callback for when a saved filter tab is selected
  const handleSelectFilter = useCallback((filterState: FilterState | null) => {
    setCurrentPage(1); // Reset to page 1 when selecting a saved filter
    // Update both draft and applied states
    setDraftFilterState(filterState);
    setAppliedFilterState(filterState);
    setHasPendingChanges(false);

    // Update URL to reflect the selected filter and reset page
    updateURL(filterState, searchTerm, 1);

    // Fetch contacts with the new filter state, current search term, and reset page
    fetchContacts(filterState, searchTerm, 1); // Fetch page 1
  }, [updateURL, fetchContacts, searchTerm]);

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
  
  // Compare two filter states to see if they're different
  const areFiltersDifferent = useCallback((a: FilterState | null, b: FilterState | null): boolean => {
    if (a === null && b === null) return false;
    if (a === null || b === null) return true;
    
    // Check logical operator
    if (a.logicalOperator !== b.logicalOperator) return true;
    
    // Check conditions count
    if (a.conditions.length !== b.conditions.length) return true;
    
    // Deep compare each condition
    for (const condA of a.conditions) {
      const condB = b.conditions.find(c => c.id === condA.id);
      if (!condB) return true;
      
      if (condA.field !== condB.field || 
          condA.operator !== condB.operator || 
          JSON.stringify(condA.value) !== JSON.stringify(condB.value)) {
        return true;
      }
    }
    
    return false;
  }, []);

  // Handler for page changes from the table's pagination component
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Fetch data for the new page, keeping current filters and search
    fetchContacts(appliedFilterState, searchTerm, newPage);
    // Update URL
    updateURL(appliedFilterState, searchTerm, newPage);
  }, [appliedFilterState, searchTerm, fetchContacts, updateURL]);

  // Calculate total pages based on total count and page size
  const totalPages = useMemo(() => {
    return Math.ceil(totalMatchingCount / pageSize);
  }, [totalMatchingCount, pageSize]);

  // Initial data fetch and setup effect - now depends on pagination state too
  useEffect(() => {
    if (currentOrganization) {
      console.log(`Fetching contacts for organization: ${currentOrganization.name} (${currentOrganization.id}) - Page: ${currentPage}`);
      // Fetch using current state values for filters, search, and pagination
      fetchContacts(appliedFilterState, searchTerm, currentPage, pageSize);
    } else {
      console.log('No current organization, waiting before fetching contacts');
    }
    // Ensure fetchContacts is stable or include all its dependencies if needed
    // Add currentPage and pageSize as dependencies
  }, [appliedFilterState, searchTerm, fetchContacts, currentOrganization, currentPage, pageSize]);


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
        
        {/* Filter Bar - with separated draft and applied states */}
        <FilterBar 
          initialFilterState={draftFilterState} 
          onSaveFilterSuccess={handleSaveFilterSuccess}
          selectedFilterId={selectedFilter?.id}
          selectedFilterName={selectedFilter?.name}
          hasPendingChanges={hasPendingChanges}
          
          // Handler for draft filter changes (doesn't trigger fetch)
          onFiltersChange={(filters) => {
            setDraftFilterState(filters);
            
            // Update pending changes indicator
            const isDifferent = areFiltersDifferent(filters, appliedFilterState);
            setHasPendingChanges(isDifferent);
          }}
          // Handler for applying filters (triggers fetch)
          onApplyFilters={(filters) => {
            setCurrentPage(1); // Reset page to 1
            setAppliedFilterState(filters);
            setHasPendingChanges(false);

            // Update URL
            updateURL(filters, searchTerm, 1);

            // Fetch with new filters, preserve search term, reset page
            fetchContacts(filters, searchTerm, 1); // Fetch page 1
          }}

          // Handler for clearing filters
          onClearFilters={() => {
            setCurrentPage(1); // Reset page to 1
            setDraftFilterState(null);
            setAppliedFilterState(null);
            setHasPendingChanges(false);

            // Update URL
            updateURL(null, searchTerm, 1);

            // Fetch with no filters, reset page
            fetchContacts(null, searchTerm, 1); // Fetch page 1
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
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          currentFilterState={appliedFilterState} // Use applied filter state for the table
          searchTerm={searchTerm}
          isLoading={isLoading} // Pass loading state to table
        />
      )}
    </PageContainer>
  );
}
