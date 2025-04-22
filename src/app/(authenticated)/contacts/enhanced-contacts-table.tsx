'use client';

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react'; // Explicitly import React
import { useRouter } from 'next/navigation';
import BulkEditModal from '@/components/contacts/BulkEditModal';
import { EnrollWorkflowModal } from '@/components/contacts/EnrollWorkflowModal'; // Import the new modal
import SendToOrganizationModal from '@/components/contacts/SendToOrganizationModal'; // Import the new Send to Org modal
import { ClientButton as Button } from '@/components/ui/client-components'; // Import aliased Button from client-components
// FilterBar import removed - handled by parent
import { FilterState } from '@/types/filters';

// Props for the EnhancedContactsTable component
interface EnhancedContactsTableProps {
  contacts: Contact[];
  totalMatchingCount: number; // Make non-optional as it's needed for pagination
  currentFilterState?: FilterState | null;
  searchTerm?: string;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean; // To potentially disable controls or show loading
}

// Types for our contact data
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
  title: string | null;
  currentCompanyName: string | null;
  status?: string;
};

// Constants
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 10;

// Single Delete confirmation modal component
function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  contact, 
  onConfirm,
  isDeleting,
  error
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  contact: Contact | null;
  onConfirm: () => void;
  isDeleting: boolean;
  error: string | null;
}) {
  if (!isOpen || !contact) return null;

  const contactName = contact.firstName || contact.lastName 
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : contact.email;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Are you sure you want to delete this contact?</h2>
        <p className="mb-4">
          This will permanently delete <strong>{contactName}</strong>. This action cannot be undone.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button variant="outline" size="default" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button
            variant="destructive"
            size="default"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Bulk Delete confirmation modal component
function BulkDeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  contactCount, 
  onConfirm,
  isDeleting,
  error
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  contactCount: number;
  onConfirm: (force?: boolean) => void;
  isDeleting: boolean;
  error: string | null;
}) {
  const [forceDelete, setForceDelete] = useState(false);
  
  // Reset force delete state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setForceDelete(false);
    }
  }, [isOpen]);
  
  if (!isOpen || contactCount === 0) return null;
  
  // Check if the error is related to workflow constraints
  const hasWorkflowError = error?.includes('Cannot delete contacts with active workflows');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Are you sure you want to delete these contacts?</h2>
        <p className="mb-4">
          This will permanently delete <strong>{contactCount}</strong> contacts. This action cannot be undone.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
            
            {hasWorkflowError && (
              <div className="mt-2 text-sm">
                These contacts have active workflows. Use the force delete option below to delete them anyway.
              </div>
            )}
          </div>
        )}
        
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="force-delete"
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 mr-2"
            checked={forceDelete}
            onChange={(e) => setForceDelete(e.target.checked)}
          />
          <label htmlFor="force-delete" className="text-sm text-gray-700">
            Force delete (will also delete associated workflow states)
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          {/* Corrected: Removed outer button, kept inner standardized Button */}
          <Button variant="outline" size="default" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          {/* Corrected: Removed outer button, kept inner standardized Button */}
          <Button
            variant="destructive"
            size="default"
            onClick={() => onConfirm(forceDelete)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Selected Contacts'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function EnhancedContactsTable({ 
  contacts, 
  totalMatchingCount = 0, 
  currentFilterState = null, 
  searchTerm = '',
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  isLoading
}: EnhancedContactsTableProps) {
  const router = useRouter();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isSelectAllMatchingActive, setIsSelectAllMatchingActive] = useState(false);
  
  // Single delete state
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Bulk delete state
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  
  // Bulk edit state
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  // Enroll in Workflow state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  // Send to Organization state
  const [isSendToOrgModalOpen, setIsSendToOrgModalOpen] = useState(false);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Pagination state is now managed by the parent component (ContactsPageClient)
  // We receive currentPage, pageSize, totalPages, and onPageChange as props.

  // Calculate display range based on props
  const indexOfFirstItem = (currentPage - 1) * pageSize;
  const indexOfLastItem = indexOfFirstItem + pageSize;

  // The `contacts` prop now represents the data for the *current page* only.
  const currentContacts = Array.isArray(contacts) ? contacts : [];

  // Effect to reset selection when filters/search change (indicated by contacts changing)
  // or when the current page changes.
  useEffect(() => {
    setIsSelectAllMatchingActive(false);
    setSelectedContactIds([]);
  }, [contacts, currentPage, currentFilterState, searchTerm]); // Depend on contacts and currentPage
  
  // Handle dropdown toggle
  const toggleDropdown = (contactId: string) => {
    setActiveDropdown(activeDropdown === contactId ? null : contactId);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeDropdown && !((event.target as Element).closest('.contact-dropdown'))) {
        setActiveDropdown(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);
  
  // Empty state
  if (contacts.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900">No contacts found</h3>
        <p className="mt-2 text-sm text-gray-500">
          No contacts found for this organization.
        </p>
      </div>
    );
  }

  // Selection handlers
  const toggleSelection = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAllOnPage = () => {
    if (selectedContactIds.length === currentContacts.length) {
      setSelectedContactIds([]);
      setIsSelectAllMatchingActive(false); // Ensure this is also reset
    } else {
      setSelectedContactIds(currentContacts.map(contact => contact.id));
      // Do not automatically set isSelectAllMatchingActive here
    }
  };

  const isSelected = (contactId: string) => selectedContactIds.includes(contactId);

  // Single delete handling
  const openDeleteModal = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setContactToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete contact');
      }

      // Success - close the modal and refresh the contact list
      closeDeleteModal();
      router.refresh();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete handling
  const openBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(true);
    setBulkDeleteError(null);
  };

  const closeBulkDeleteModal = () => {
    setIsBulkDeleteModalOpen(false);
    setBulkDeleteError(null);
  };
  
  // Bulk edit handling
  const openBulkEditModal = () => {
    setIsBulkEditModalOpen(true);
  };

  const closeBulkEditModal = () => {
    setIsBulkEditModalOpen(false);
  };

  // Enroll modal handling
  const openEnrollModal = () => {
    setIsEnrollModalOpen(true);
  };

  const closeEnrollModal = () => {
    setIsEnrollModalOpen(false);
  };

  // Send to Org modal handling
  const openSendToOrgModal = () => {
    setIsSendToOrgModalOpen(true);
  };

  const closeSendToOrgModal = () => {
    setIsSendToOrgModalOpen(false);
  };

  // Callback after successful enrollment
  const handleEnrollmentComplete = useCallback(() => {
    // Clear selection state
    setSelectedContactIds([]);
    setIsSelectAllMatchingActive(false);
    // Optionally, you could add a success message here or trigger a refresh
    // router.refresh(); // Uncomment if you want to refresh data after enrollment
  }, []); // Removed router from dependencies unless refresh is needed

  const handleBulkDelete = async (force: boolean = false) => {
    if (selectedContactIds.length === 0 && !isSelectAllMatchingActive) return;
    
    setIsBulkDeleting(true);
    setBulkDeleteError(null);

    try {
      const requestBody = isSelectAllMatchingActive 
        ? {
            isSelectAllMatchingActive: true,
            filterState: currentFilterState,
            searchTerm: searchTerm,
            force: force
          }
        : {
            contactIds: selectedContactIds,
            force: force
          };

      const response = await fetch('/api/contacts/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        // Extract detailed error message from the response
        const errorMessage = responseData.message || 'Failed to delete contacts';
        const errorDetails = responseData.details || '';
        const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        throw new Error(fullErrorMessage);
      }

      // Success - close the modal, clear selection, and refresh the contact list
      closeBulkDeleteModal();
      setSelectedContactIds([]); // Clear selection after bulk delete
      router.refresh();
      
      // Optionally show a success message
      console.log(`Successfully deleted ${responseData.deletedCount} contacts`);
      
    } catch (error) {
      console.error('Error bulk deleting contacts:', error);
      setBulkDeleteError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Helper to get the number of contacts selected on the current page
  const selectedOnPageCount = currentContacts.filter(c => selectedContactIds.includes(c.id)).length;

  return (
    <>
      {/* Filter Bar removed from here */}
      
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Bulk actions bar - shown when contacts are selected */}
        {selectedContactIds.length > 0 && (
          <div className="bg-gray-100 p-3 flex items-center justify-between border-b">
            <div className="text-sm">
              {!isSelectAllMatchingActive ? (
                <div className="font-medium">
                  {selectedContactIds.length} {selectedContactIds.length === 1 ? 'contact' : 'contacts'} selected
                  {/* Show "Select all matching" only if all on page are selected AND there are more matching contacts total */}
                  {selectedOnPageCount === currentContacts.length && totalMatchingCount > currentContacts.length && (
                    <span className="ml-2 text-blue-600">
                      All {currentContacts.length} contacts on this page are selected.{' '}
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsSelectAllMatchingActive(true);
                      // Optionally clear page selection if needed, or keep them selected
                      // setSelectedContactIds([]); // Decide if you want to clear page selection
                    }}
                    className="text-sm p-0 h-auto"
                  >
                    Select all {totalMatchingCount} matching contacts
                  </Button>
                    </span>
                  )}
                </div>
              ) : (
                <div className="font-medium">
                  All {totalMatchingCount} contacts matching filters are selected.{' '}
                  <Button
                    variant="link"
                    onClick={() => {
                      setIsSelectAllMatchingActive(false);
                      setSelectedContactIds([]);
                    }}
                    className="text-sm p-0 h-auto"
                  >
                    Clear selection
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={openBulkDeleteModal}
              >
                Bulk Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openBulkEditModal}
              >
                Bulk Edit
              </Button>
              {/* Enroll Button */}
              <Button
                variant="secondary" // Changed to secondary
                size="sm"
                onClick={openEnrollModal}
              >
                Enroll in Workflow
              </Button>
              {/* Send to Organization Button */}
              <Button
                variant="outline" // Or choose another appropriate variant
                size="sm"
                onClick={openSendToOrgModal}
              >
                Send to Organization
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-left">
                  <input 
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    // Checkbox reflects selection state *on the current page*
                    checked={currentContacts.length > 0 && selectedOnPageCount === currentContacts.length}
                    onChange={selectAllOnPage}
                    aria-label="Select all contacts on this page"
                    disabled={isLoading} // Disable if loading
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected(contact.id)}
                      onChange={() => toggleSelection(contact.id)}
                      aria-label={`Select ${contact.firstName || contact.email}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {contact.photoUrl ? (
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full" src={contact.photoUrl} alt="" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500">
                            {contact.firstName?.charAt(0) ||
                              (contact.email ? contact.email.charAt(0).toUpperCase() : '?')}
                          </span>
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.firstName || contact.lastName 
                            ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                            : 'Unknown Name'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                    <div className="text-sm text-gray-900 truncate" title={contact.email || 'No email'}>
                      {contact.email || <span className="text-gray-400 italic">No email</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                    <div className="text-sm text-gray-900 truncate" title={contact.title || '-'}>{contact.title || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap overflow-hidden">
                    <div className="text-sm text-gray-900 truncate" title={contact.currentCompanyName || '-'}>{contact.currentCompanyName || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contact.status ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {contact.status}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        No Status
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block text-left contact-dropdown">
                      {/* Replaced raw button with Button component */}
                      <Button
                        variant="ghost"
                        size="sm" // Using sm for slightly smaller target
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(contact.id);
                        }}
                      >
                        •••
                      </Button>
                      <div
                        className={`absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ${activeDropdown === contact.id ? 'block' : 'hidden'} z-10 border border-border`} // Added border
                      >
                        <div className="py-1 border border-gray-200 rounded-md">
                          <a 
                            href={`/contacts/${contact.id}/edit`} 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </a>
                          {/* Ensured destructive text color */}
                          <button
                            onClick={() => openDeleteModal(contact)}
                            className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            {/* Mobile pagination controls - Use onPageChange prop */}
            <Button
              variant="outline"
              size="default"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700 self-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="default"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            {/* Desktop pagination info - Use totalMatchingCount prop */}
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{totalMatchingCount === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, totalMatchingCount)}</span> of{' '}
                <span className="font-medium">{totalMatchingCount}</span> results
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Items per page selector */}
              <div className="flex items-center">
                {/* Items per page selector - This needs to be handled in the parent now */}
                {/* Consider removing this or passing props to control pageSize in parent */}
                {/* For now, we'll comment it out as pageSize is fixed in parent */}
                {/*
                <label htmlFor="items-per-page" className="text-sm text-gray-600 mr-2">
                  Per page:
                </label>
                <select
                  id="items-per-page"
                  value={pageSize} // Use pageSize prop
                  // onChange={(e) => handlePageSizeChange(Number(e.target.value))} // Need handler prop from parent
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  disabled={isLoading} // Disable if loading
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                */}
              </div>
              
              {/* Desktop pagination controls */}
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {/* Desktop pagination controls - Use onPageChange prop */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1 || isLoading}
                    className="rounded-r-none"
                  >
                    <span className="sr-only">First Page</span>
                    <span>«</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="rounded-none"
                  >
                    <span className="sr-only">Previous Page</span>
                    <span>‹</span>
                  </Button>

                  {/* Page numbers - Use totalPages prop */}
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      // Calculate which page numbers to show
                      let pageNum;
                      if (totalPages <= 5) {
                        // If 5 or fewer pages, show all pages
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        // If current page is 1-3, show pages 1-5
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        // If current page is near the end, show last 5 pages
                        pageNum = totalPages - 4 + i;
                      } else {
                        // Otherwise show 2 pages before and 2 after current page
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(pageNum)}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                          className="rounded-none"
                          disabled={isLoading} // Disable if loading
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="rounded-none"
                  >
                    <span className="sr-only">Next Page</span>
                    <span>›</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || isLoading}
                    className="rounded-l-none"
                  >
                    <span className="sr-only">Last Page</span>
                    <span>»</span>
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single delete confirmation modal */}
      <DeleteConfirmationModal 
        isOpen={!!contactToDelete}
        onClose={closeDeleteModal}
        contact={contactToDelete}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Bulk delete confirmation modal */}
      <BulkDeleteConfirmationModal 
        isOpen={isBulkDeleteModalOpen}
        onClose={closeBulkDeleteModal}
        contactCount={selectedContactIds.length}
        onConfirm={handleBulkDelete}
        isDeleting={isBulkDeleting}
        error={bulkDeleteError}
      />

      {/* Bulk edit modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={closeBulkEditModal}
        contactIds={selectedContactIds}
        isSelectAllMatchingActive={isSelectAllMatchingActive}
        totalMatchingCount={totalMatchingCount}
        currentFilterState={currentFilterState}
        searchTerm={searchTerm}
      />

      {/* Enroll Workflow Modal */}
      <EnrollWorkflowModal
        isOpen={isEnrollModalOpen}
        onClose={closeEnrollModal}
        selectedContacts={{
          // Only pass contactIds if 'select all matching' is NOT active
          contactIds: isSelectAllMatchingActive ? undefined : selectedContactIds, 
          isSelectAllMatchingActive: isSelectAllMatchingActive,
          // Pass filters and search term regardless, backend uses them if isSelectAllMatchingActive is true
          filters: currentFilterState ?? undefined, 
          searchTerm: searchTerm ?? undefined, 
         }}
        onEnrollmentComplete={handleEnrollmentComplete}
      />

      {/* Send to Organization Modal */}
      <SendToOrganizationModal
        isOpen={isSendToOrgModalOpen}
        onClose={closeSendToOrgModal}
        contactIds={selectedContactIds}
        isSelectAllMatchingActive={isSelectAllMatchingActive}
        totalMatchingCount={totalMatchingCount}
        currentFilterState={currentFilterState}
        searchTerm={searchTerm}
      />
    </>
  );
}
