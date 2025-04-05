'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BulkEditModal from '@/components/contacts/BulkEditModal';
// FilterBar import removed - handled by parent
import { FilterState } from '@/types/filters';

// Props for the EnhancedContactsTable component
interface EnhancedContactsTableProps {
  contacts: Contact[];
  totalMatchingCount?: number;
  currentFilterState?: FilterState | null;
  searchTerm?: string;
}

// Types for our contact data
type Contact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
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
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
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
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(forceDelete)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Selected Contacts'}
          </button>
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
  searchTerm = '' 
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  
  // Dropdown state to fix the issue with dropdowns disappearing when mouse leaves
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Calculate pagination values
  const totalItems = contacts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Page change handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };
  
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    // Recalculate current page to ensure it's still valid with new items per page
    const newTotalPages = Math.ceil(totalItems / newItemsPerPage);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages);
    }
  };
  
  // Get current page data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContacts = contacts.slice(indexOfFirstItem, indexOfLastItem);
  
  // Reset to first page when contacts array changes (e.g., after filtering)
  useEffect(() => {
    setCurrentPage(1);
    // Reset the "Select All Matching" state when filters or search changes
    setIsSelectAllMatchingActive(false);
    setSelectedContactIds([]);
  }, [contacts.length, currentFilterState, searchTerm]);
  
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

  const selectAll = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(contact => contact.id));
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

  // Filter state and handlers
  const handleFiltersChange = (newFilters: FilterState) => {
    // Filters will be handled by the server component
    // This is just to handle any client-side effects
    console.log('Filters changed:', newFilters);
  };

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
                  {selectedContactIds.length === contacts.length && totalMatchingCount > contacts.length && (
                    <span className="ml-2 text-blue-600">
                      All {contacts.length} contacts on this page are selected.{' '}
                      <button 
                        onClick={() => setIsSelectAllMatchingActive(true)}
                        className="text-blue-700 hover:text-blue-800 underline"
                      >
                        Select all {totalMatchingCount} contacts matching filters
                      </button>
                    </span>
                  )}
                </div>
              ) : (
                <div className="font-medium">
                  All {totalMatchingCount} contacts matching filters are selected.{' '}
                  <button 
                    onClick={() => {
                      setIsSelectAllMatchingActive(false);
                      setSelectedContactIds([]);
                    }}
                    className="text-blue-700 hover:text-blue-800 underline"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={openBulkDeleteModal}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                Bulk Delete
              </button>
              <button 
                onClick={openBulkEditModal}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                Bulk Edit
              </button>
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
                    checked={contacts.length > 0 && selectedContactIds.length === contacts.length}
                    onChange={selectAll}
                    aria-label="Select all contacts"
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
                            {contact.firstName?.charAt(0) || contact.email.charAt(0).toUpperCase()}
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
                    <div className="text-sm text-gray-900 truncate" title={contact.email}>{contact.email}</div>
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
                      <button
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(contact.id);
                        }}
                      >
                        •••
                      </button>
                      <div 
                        className={`absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ${activeDropdown === contact.id ? 'block' : 'hidden'} z-10`}
                      >
                        <div className="py-1 border border-gray-200 rounded-md">
                          <a 
                            href={`/contacts/${contact.id}/edit`} 
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Edit
                          </a>
                          <button 
                            onClick={() => openDeleteModal(contact)} 
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
            {/* Mobile pagination controls */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            {/* Desktop pagination info */}
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastItem, totalItems)}</span> of{' '}
                <span className="font-medium">{totalItems}</span> contacts
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Items per page selector */}
              <div className="flex items-center">
                <label htmlFor="items-per-page" className="text-sm text-gray-600 mr-2">
                  Per page:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Desktop pagination controls */}
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">First Page</span>
                    <span>«</span>
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous Page</span>
                    <span>‹</span>
                  </button>
                  
                  {/* Page numbers */}
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
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                            ${currentPage === pageNum 
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next Page</span>
                    <span>›</span>
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Last Page</span>
                    <span>»</span>
                  </button>
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
    </>
  );
}
