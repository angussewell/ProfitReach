'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TagSelector from '@/components/filters/TagSelector';
import { format } from 'date-fns';
import { getCommonFieldOptions, LEAD_STATUS_OPTIONS } from '@/lib/field-definitions';

// Field options for bulk editing - use the common fields subset from the centralized definition
const FIELD_OPTIONS = getCommonFieldOptions();

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactIds: string[];
  isSelectAllMatchingActive?: boolean;
  totalMatchingCount?: number;
  currentFilterState?: any;
  searchTerm?: string;
}

export default function BulkEditModal({ 
  isOpen, 
  onClose, 
  contactIds, 
  isSelectAllMatchingActive = false,
  totalMatchingCount = 0,
  currentFilterState = null,
  searchTerm = ''
}: BulkEditModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for dynamic field selection
  const [selectedField, setSelectedField] = useState('');
  const [textValue, setTextValue] = useState('');
  const [leadStatusValue, setLeadStatusValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  // New state to track if "Clear Field Value" is active
  const [isClearingField, setIsClearingField] = useState(false);

  // Don't render if modal is not open or no contacts selected/matched
  if (!isOpen || (contactIds.length === 0 && !isSelectAllMatchingActive)) return null;
  
  // Determine actual contact count based on selection mode
  const effectiveContactCount = isSelectAllMatchingActive ? totalMatchingCount : contactIds.length;

  // Reset form values when field changes
  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    setTextValue('');
    setLeadStatusValue('');
    setDateValue('');
    setSelectedTags([]);
    setIsClearingField(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate field selection
    if (!selectedField) {
      setError('Please select a field to update');
      setIsSubmitting(false);
      return;
    }

    // Get the field value based on the selected field type and clearing status
    let fieldValue: any;
    
    // If clearing field mode is active, set value to null
    if (isClearingField) {
      fieldValue = null;
    } else {
      // Otherwise, use the value from the appropriate input
      switch (selectedField) {
        case 'leadStatus':
          if (!leadStatusValue) {
            setError('Please select a lead status');
            setIsSubmitting(false);
            return;
          }
          fieldValue = leadStatusValue;
          break;
          
        case 'lastActivityAt':
          if (!dateValue) {
            setError('Please select a date');
            setIsSubmitting(false);
            return;
          }
          fieldValue = new Date(dateValue).toISOString();
          break;
          
        case 'tags':
          if (!selectedTags.length) {
            setError('Please select at least one tag');
            setIsSubmitting(false);
            return;
          }
          fieldValue = selectedTags;
          break;
          
        default: // Text fields
          if (!textValue) {
            setError('Please enter a value');
            setIsSubmitting(false);
            return;
          }
          fieldValue = textValue;
      }
    }

    try {
      const requestBody = isSelectAllMatchingActive 
        ? {
            isSelectAllMatchingActive: true,
            filterState: currentFilterState,
            searchTerm: searchTerm,
            fieldToUpdate: selectedField,
            newValue: fieldValue
          }
        : {
            contactIds,
            fieldToUpdate: selectedField,
            newValue: fieldValue
          };

      const response = await fetch('/api/contacts/bulk-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update contacts');
      }

      // Success - close the modal and refresh the page
      onClose();
      router.refresh();
    } catch (err) {
      console.error('Error during bulk edit:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          Bulk Edit {effectiveContactCount} {effectiveContactCount === 1 ? 'Contact' : 'Contacts'}
        </h2>
        
        <p className="mb-4 text-sm text-gray-600">
          Select the fields you want to update. Only the enabled fields will be changed.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Field selector */}
          <div>
            <label htmlFor="fieldToUpdate" className="block text-sm font-medium text-gray-700 mb-1">
              Field to Update
            </label>
            <select
              id="fieldToUpdate"
              value={selectedField}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-foreground"
            >
              <option value="">Select a field</option>
              {FIELD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Dynamic input based on selected field */}
          {selectedField && (
            <div>
              <label htmlFor="fieldValue" className="block text-sm font-medium text-gray-700 mb-1">
                New Value for {FIELD_OPTIONS.find(f => f.value === selectedField)?.label}
              </label>
              
              {/* Text input for text fields */}
              {['title', 'currentCompanyName', 'country', 'state', 'city'].includes(selectedField) && (
                <div className="space-y-2">
                  <input
                    type="text"
                    id="fieldValue"
                    value={textValue}
                    onChange={(e) => {
                      setTextValue(e.target.value);
                      setIsClearingField(false);
                    }}
                    placeholder={`Enter ${FIELD_OPTIONS.find(f => f.value === selectedField)?.label}`}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-foreground"
                    disabled={isClearingField}
                  />
                  
                  <button 
                    type="button"
                    className={`w-full mt-2 px-4 py-2 rounded-md ${
                      isClearingField 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => {
                      setIsClearingField(!isClearingField);
                      if (!isClearingField) {
                        setTextValue('');
                      }
                    }}
                  >
                    {isClearingField ? "Clear Mode Active" : "Clear Field Value"}
                  </button>
                </div>
              )}
              
              {/* Lead status dropdown */}
              {selectedField === 'leadStatus' && (
                <div className="space-y-2">
                  <select
                    id="fieldValue"
                    value={leadStatusValue}
                    onChange={(e) => {
                      setLeadStatusValue(e.target.value);
                      setIsClearingField(false);
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-foreground"
                    disabled={isClearingField}
                  >
                    <option value="">Select a status</option>
                    {LEAD_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    type="button"
                    className={`w-full mt-2 px-4 py-2 rounded-md ${
                      isClearingField 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => {
                      setIsClearingField(!isClearingField);
                      if (!isClearingField) {
                        setLeadStatusValue('');
                      }
                    }}
                  >
                    {isClearingField ? "Clear Mode Active" : "Clear Field Value"}
                  </button>
                </div>
              )}
              
              {/* Date picker for lastActivityAt */}
              {selectedField === 'lastActivityAt' && (
                <div className="space-y-2">
                  <input
                    type="date"
                    id="fieldValue"
                    value={dateValue}
                    onChange={(e) => {
                      setDateValue(e.target.value);
                      setIsClearingField(false);
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-foreground"
                    disabled={isClearingField}
                  />
                  
                  <button 
                    type="button"
                    className={`w-full mt-2 px-4 py-2 rounded-md ${
                      isClearingField 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => {
                      setIsClearingField(!isClearingField);
                      if (!isClearingField) {
                        setDateValue('');
                      }
                    }}
                  >
                    {isClearingField ? "Clear Mode Active" : "Clear Field Value"}
                  </button>
                </div>
              )}
              
              {/* Tag selector for tags */}
              {selectedField === 'tags' && (
                <div className="space-y-2">
                  <div className={isClearingField ? "opacity-50 pointer-events-none" : ""}>
                    <TagSelector
                      selectedTags={selectedTags}
                      onChange={(tags) => {
                        setSelectedTags(tags);
                        setIsClearingField(false);
                      }}
                      placeholder="Select or create tags..."
                      disabled={isClearingField}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {isClearingField 
                        ? "All tags will be removed from selected contacts."
                        : "Selected tags will replace any existing tags for all selected contacts."}
                    </p>
                  </div>
                  
                  <button 
                    type="button"
                    className={`w-full mt-2 px-4 py-2 rounded-md ${
                      isClearingField 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => {
                      setIsClearingField(!isClearingField);
                      if (!isClearingField) {
                        setSelectedTags([]);
                      }
                    }}
                  >
                    {isClearingField ? "Clear Mode Active" : "Clear All Tags"}
                  </button>
                </div>
              )}
              
              <p className="mt-1 text-sm text-gray-500">
                This will update {effectiveContactCount} {effectiveContactCount === 1 ? 'contact' : 'contacts'}.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Contacts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
