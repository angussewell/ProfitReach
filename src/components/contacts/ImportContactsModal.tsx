'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa, { ParseResult, ParseError } from 'papaparse';
import { SearchableSelect } from '@/components/ui/searchable-select';
import TagSelector from '@/components/filters/TagSelector'; // Import TagSelector
import { useOrganization } from '@/contexts/OrganizationContext'; // Import OrganizationContext hook

import { 
  FIELD_GROUPS, 
  CONTACT_FIELDS, 
  getFlattenedFields, 
  getGroupedFields,
  FieldOption,
  LEAD_STATUS_OPTIONS
} from '@/lib/field-definitions';

// Define the stages of import process
type ImportStage = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete' | 'error';

// Add the "Ignore this column" option that is specific to the import modal
const IMPORT_CONTACT_FIELDS: FieldOption[] = [
  ...CONTACT_FIELDS,
  { value: "", label: "Ignore this column", group: FIELD_GROUPS.OTHER }
];

// Group contact fields by category for the UI
const GROUPED_CONTACT_FIELDS = getGroupedFields();

// Flatten the grouped fields for the search
const FLAT_CONTACT_FIELDS = getFlattenedFields();

// Required fields for validation
const REQUIRED_FIELDS = ["email"];

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportContactsModal({ isOpen, onClose }: ImportContactsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentOrganization } = useOrganization(); // Get current organization
  
  // State management
  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [commonTags, setCommonTags] = useState<string[]>([]); // State for common tags
  // State for import results, now including duplicate info
  const [importResults, setImportResults] = useState<{
    successCount: number; // Actually inserted
    validationErrorCount: number; // Failed initial validation (API)
    duplicateSkipCount: number; // Skipped due to existing email (API)
    clientSkippedCount: number; // Skipped client-side due to missing required fields
    validationErrors: any[]; // Details on validation errors (API)
    skippedDuplicates: any[]; // Details on duplicate skips (API)
    databaseErrors?: any[]; // Optional: Track DB errors if returned by API
  } | null>(null);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStage('upload');
    setCsvData([]);
    setHeaders([]);
    setMappings({});
    setError(null);
    setNotification(null);
    setCommonTags([]); // Reset common tags on close
    setImportResults(null);
    onClose();
  }, [onClose]);

  // Enhanced mapping change handler to prevent duplicate field mappings
  const handleMappingChange = useCallback((csvHeader: string, selectedField: string) => {
    setMappings(prev => {
      // Create new mappings object for immutability
      const newMappings = { ...prev };
      
      // If selectedField is not empty (not "Ignore this column") and is already used elsewhere
      if (selectedField !== "" && Object.entries(newMappings).some(
        ([header, field]) => header !== csvHeader && field === selectedField)
      ) {
        // Find which headers use this field
        const duplicateHeaders = Object.entries(newMappings)
          .filter(([header, field]) => header !== csvHeader && field === selectedField)
          .map(([header]) => header);
        
        // Reset the mappings for duplicate headers
        duplicateHeaders.forEach(header => {
          newMappings[header] = "";
        });
        
        // Show notification to user about the change
        const fieldLabel = CONTACT_FIELDS.find(f => f.value === selectedField)?.label || selectedField;
        setNotification(`"${fieldLabel}" was already mapped to ${duplicateHeaders.length === 1 
          ? `column "${duplicateHeaders[0]}"` 
          : `columns: ${duplicateHeaders.join(', ')}`}. ${duplicateHeaders.length === 1 
            ? 'That mapping has' 
            : 'Those mappings have'} been reset to "Ignore this column".`);
        
        // Auto-dismiss notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
      
      // Set the new mapping for this header
      newMappings[csvHeader] = selectedField;
      
      return newMappings;
    });
  }, []);
  
  // CSV file upload and parsing
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<any>) => {
        if (results.errors && results.errors.length > 0) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }
        
        if (results.data.length === 0) {
          setError('The CSV file is empty');
          return;
        }
        
        // Set the data and headers
        setCsvData(results.data);
        
        // Get headers from the first row
        const csvHeaders = Object.keys(results.data[0] || {});
        setHeaders(csvHeaders);
        
        // Auto-map common fields
        const initialMappings: Record<string, string> = {};
        csvHeaders.forEach(header => {
          // Convert header to lowercase for case-insensitive matching
          const headerLower = header.toLowerCase();
          
          // Try to auto-map based on common naming patterns
          if (headerLower.includes('email')) {
            initialMappings[header] = 'email';
          } else if (headerLower.includes('first') && headerLower.includes('name')) {
            initialMappings[header] = 'firstName';
          } else if (headerLower.includes('last') && headerLower.includes('name')) {
            initialMappings[header] = 'lastName';
          } else if (headerLower === 'company' || headerLower.includes('company name')) {
            initialMappings[header] = 'currentCompanyName';
          } else if (headerLower === 'title' || headerLower === 'job title') {
            initialMappings[header] = 'title';
          } else if (headerLower.includes('linkedin')) {
            initialMappings[header] = 'linkedinUrl';
          } else if (headerLower.includes('status')) {
            initialMappings[header] = 'leadStatus';
          } else if (headerLower === 'city') {
            initialMappings[header] = 'city';
          } else if (headerLower === 'state' || headerLower === 'province') {
            initialMappings[header] = 'state';
          } else if (headerLower === 'country') {
            initialMappings[header] = 'country';
          } else if (headerLower.includes('website') || 
                     (headerLower.includes('company') && headerLower.includes('url'))) {
            initialMappings[header] = 'companyWebsiteUrl';
          } else if (headerLower === 'twitter' || headerLower.includes('twitter url')) {
            initialMappings[header] = 'twitterUrl';
          } else if (headerLower === 'facebook' || headerLower.includes('facebook url')) {
            initialMappings[header] = 'facebookUrl';
          } else if (headerLower.includes('github')) {
            initialMappings[header] = 'githubUrl';
          } else {
            initialMappings[header] = '';
          }
        });
        
        setMappings(initialMappings);
        
        // Move to mapping stage
        setStage('mapping');
      },
      error: (error: Error) => {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };
  
  // Transform a CSV row based on mappings
  const transformRow = (row: any) => {
    const result: Record<string, any> = {};
    const additionalData: Record<string, any> = {};
    
    // Process each mapping
    Object.entries(mappings).forEach(([csvHeader, contactField]) => {
      if (!contactField || contactField === '') return; // Skip ignored fields
      
      const value = row[csvHeader];
      if (value === undefined || value === null || value === '') return;
      
      // Handle additionalData fields
      if (contactField.startsWith('additionalData.')) {
        const subfield = contactField.replace('additionalData.', '');
        additionalData[subfield] = value;
      } else {
        result[contactField] = value;
      }
    });
    
    // Add additionalData if we have any
    if (Object.keys(additionalData).length > 0) {
      result.additionalData = additionalData;
    }
    
    return result;
  };

  // Check if a contact has all required fields
  const hasRequiredFields = (contact: Record<string, any>) => {
    // Required fields: email, linkedinUrl, currentCompanyName
    return (
      contact.email && 
      typeof contact.email === 'string' && 
      contact.email.trim() !== ''
    );
  };

  // Validate mappings
  const validateMappings = () => {
    // Ensure email is mapped
    const isEmailMapped = Object.values(mappings).includes('email');
    
    if (!isEmailMapped) {
      setError('Email field is required. Please map a column to the Email field.');
      return false;
    }
    
    return true;
  };
  
  // Handle submit for the mapping stage
  const handleMappingSubmit = () => {
    if (validateMappings()) {
      setStage('preview');
    }
  };
  
  // Handle the final import with improved error handling - using n8n webhook
  const handleImport = async () => {
    setStage('importing');
    setError(null);
    
    try {
      // Transform all data according to the mappings
      const allTransformedContacts = csvData.map(transformRow);
      
      // Filter contacts to only include those with required fields
      const validContacts = allTransformedContacts.filter(hasRequiredFields);
      
      // Calculate skipped contacts due to missing required fields
      const missingRequiredFieldsCount = allTransformedContacts.length - validContacts.length;
      
      // Get current organization ID from session if available
      // Note: This may be needed by n8n to properly isolate data
      // const orgId = currentOrgId || sessionData?.user?.organizationId;
      
      console.log(`Sending ${validContacts.length} contacts to n8n webhook...`);
      
      // Submit valid contacts directly to the n8n webhook instead of internal API
      const response = await fetch('https://n8n.srv768302.hstgr.cloud/webhook/contacts-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contacts: validContacts, 
          commonTags,
          // Include organization ID for proper data isolation
          organizationId: currentOrganization?.id
        }),
      });
      
      // Process response from n8n (assuming similar structure to our previous API)
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${errorText || 'The n8n service may be unavailable'}`);
      }
      
      const result = await response.json();
      
      // Process the results from n8n webhook
      const processedResults = {
        successCount: result.successCount || 0,
        validationErrorCount: result.validationErrorCount || 0,
        duplicateSkipCount: result.duplicateSkipCount || 0,
        clientSkippedCount: missingRequiredFieldsCount, // Calculated client-side
        validationErrors: result.validationErrors || [],
        skippedDuplicates: result.skippedDuplicates || [],
        databaseErrors: result.databaseErrors || []
      };

      // Log detailed results for debugging
      console.log("n8n Import Response:", result);
      console.log("Processed Import Results:", processedResults);

      setImportResults(processedResults);
      setStage('complete');
      
      // Refresh the contacts list
      router.refresh();
    } catch (err) {
      console.error('Error importing contacts via n8n:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred with the import service');
      setStage('error');
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  // Content for upload stage
  if (stage === 'upload') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Import Contacts from CSV</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload CSV File</h3>
              <p className="text-sm text-gray-500">
                Drag and drop a CSV file or click to browse
              </p>
            </div>
            
            <div className="mt-4">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => fileInputRef.current?.click()}
              >
                Select CSV File
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Content for mapping stage
  if (stage === 'mapping') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Map CSV Columns to Contact Fields</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Map each column from your CSV to the corresponding contact field. Fields marked with * are required.
          </p>
          
          <div className="border rounded-md overflow-hidden mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSV Column
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Field
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Values
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {headers.map((header) => (
                  <tr key={header}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {header}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow">
                          <SearchableSelect
                            options={FLAT_CONTACT_FIELDS}
                            value={mappings[header] || ""}
                            onChange={(value) => handleMappingChange(header, value)}
                            placeholder="Select or search for a field..."
                            emptyMessage="No matching fields found"
                          />
                        </div>
                        {mappings[header] && (
                          <button
                            type="button"
                            onClick={() => handleMappingChange(header, "")}
                            className="h-8 px-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Ignore this column"
                            aria-label="Ignore this column"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        )}
                      </div>
                      {REQUIRED_FIELDS.includes('email') && mappings[header] === 'email' && (
                        <div className="mt-1 text-xs text-red-500 font-medium">* Required field</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {csvData.slice(0, 2).map((row, i) => (
                        <div key={i} className="truncate max-w-sm">
                          {String(row[header] || '')}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {notification && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>{notification}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setStage('upload')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleMappingSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Content for preview stage
  if (stage === 'preview') {
    // Transform data for preview
    const previewData = csvData.slice(0, 3).map(transformRow);
    const mappedFields = Object.values(mappings).filter(v => v && !v.startsWith('additionalData'));
    const additionalDataFields = Object.values(mappings)
      .filter(v => v && v.startsWith('additionalData'))
      .map(v => v.replace('additionalData.', ''));
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Review and Confirm Import</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Review the data below and confirm that it looks correct before importing.
          </p>
          
          <div className="border rounded-md overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {mappedFields.map((field, headerIndex) => (
                    <th key={`header-${headerIndex}-${field}`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {CONTACT_FIELDS.find(f => f.value === field)?.label || field}
                    </th>
                  ))}
                  {additionalDataFields.length > 0 && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Additional Data
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {mappedFields.map((field, fieldIndex) => (
                      <td key={`row-${rowIndex}-field-${fieldIndex}-${field}`} className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                        {String(row[field] || '')}
                      </td>
                    ))}
                    {additionalDataFields.length > 0 && (
                      <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                        {row.additionalData && (
                          <pre className="text-xs">
                            {JSON.stringify(row.additionalData, null, 2)}
                          </pre>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="text-xs text-gray-500 mb-4">
            Showing preview of first 3 rows from {csvData.length} total rows
          </p>
          
          {/* Import summary */}
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium">Import Summary</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Total rows: {csvData.length}</li>
              <li>Fields to import: {Object.values(mappings).filter(v => v).length}</li>
              <li>Required fields: Email {Object.values(mappings).includes('email') ? '✅' : '❌'}</li>
            </ul>
          </div>

          {/* Add Common Tags Section */}
          <div className="mb-4 p-4 border rounded-md">
            <h4 className="font-medium mb-2">Apply Additional Tags to ALL Imported Contacts (Optional)</h4>
            <TagSelector
              selectedTags={commonTags}
              onChange={setCommonTags}
              placeholder="Search or create tags to add to all contacts..."
              // Note: Ensure TagSelector fetches org-specific tags if needed
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setStage('mapping')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Import {csvData.length} Contacts
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Content for importing stage (progress)
  if (stage === 'importing') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Importing Contacts</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium opacity-50 cursor-not-allowed"
              aria-label="Close"
              disabled
            >
              ×
            </button>
          </div>
          
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700"></div>
            <p className="mt-4 text-sm text-center">
              Importing {csvData.length} contacts... This may take a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Content for complete stage
  if (stage === 'complete' && importResults) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Import Complete</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          <div className="bg-green-50 p-4 rounded-md mb-4">
            <div className="flex">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Import Successful</h3>
                <div className="mt-2 text-sm text-green-700 space-y-1">
                  <p>Successfully imported <strong>{importResults.successCount}</strong> contacts.</p>
                  {/* Display API-reported duplicate skips */}
                  {importResults.duplicateSkipCount > 0 && (
                    <p>Skipped <strong>{importResults.duplicateSkipCount}</strong> contacts because their email address already exists.</p>
                  )}
                  {/* Display API-reported validation errors */}
                  {importResults.validationErrorCount > 0 && (
                     <p><strong>{importResults.validationErrorCount}</strong> rows failed validation and were not imported.</p>
                  )}
                   {/* Display client-side skips (missing required fields) */}
                  {importResults.clientSkippedCount > 0 && (
                    <p>Skipped <strong>{importResults.clientSkippedCount}</strong> contacts client-side due to missing required fields (e.g., email).</p>
                  )}
                   {/* Display database errors if any */}
                   {importResults.databaseErrors && importResults.databaseErrors.length > 0 && (
                     <p className="text-red-600">Encountered <strong>{importResults.databaseErrors.length}</strong> database errors during insertion.</p>
                   )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Combined section for Validation Errors and Duplicate Skips */}
          {(importResults.validationErrorCount > 0 || importResults.duplicateSkipCount > 0 || (importResults.databaseErrors && importResults.databaseErrors.length > 0)) && (
            <div className="bg-yellow-50 p-4 rounded-md mb-4 max-h-60 overflow-y-auto">
              <div className="flex">
                <svg className="h-6 w-6 text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Import Issues</h3>
                  <div className="mt-2 text-sm text-yellow-700 space-y-2">
                    {/* Validation Errors */}
                    {importResults.validationErrorCount > 0 && (
                      <div>
                        <p><strong>Validation Errors ({importResults.validationErrorCount}):</strong></p>
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                          {importResults.validationErrors.slice(0, 10).map((error, index) => ( // Show first 10
                            <li key={`val-err-${index}`}>Row {error.row}: {error.message}</li>
                          ))}
                          {importResults.validationErrors.length > 10 && <li>...and more</li>}
                        </ul>
                      </div>
                    )}
                    {/* Duplicate Skips */}
                    {importResults.duplicateSkipCount > 0 && (
                       <div>
                         <p><strong>Skipped Duplicates ({importResults.duplicateSkipCount}):</strong></p>
                         <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                           {importResults.skippedDuplicates.slice(0, 10).map((skip, index) => ( // Show first 10
                             <li key={`dup-skip-${index}`}>Row {skip.row}: Email "{skip.email}" already exists.</li>
                           ))}
                           {importResults.skippedDuplicates.length > 10 && <li>...and more</li>}
                         </ul>
                       </div>
                    )}
                     {/* Database Errors */}
                    {importResults.databaseErrors && importResults.databaseErrors.length > 0 && (
                       <div>
                         <p className="text-red-700"><strong>Database Errors ({importResults.databaseErrors.length}):</strong></p>
                         <ul className="list-disc pl-5 mt-1 space-y-1 text-xs text-red-600">
                           {importResults.databaseErrors.slice(0, 10).map((dbError, index) => ( // Show first 10
                             <li key={`db-err-${index}`}>Batch starting index {dbError.batchStartIndex}: {dbError.message}</li>
                           ))}
                           {importResults.databaseErrors.length > 10 && <li>...and more</li>}
                         </ul>
                       </div>
                    )}
                    {/* Removed extra </ul> tag from here */}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
            <button
              onClick={() => {
                setStage('upload');
                setCsvData([]);
                setHeaders([]);
                setMappings({});
                setError(null);
                setCommonTags([]); // Reset common tags
                setImportResults(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Import Another File
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Content for error stage
  if (stage === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Import Failed</h2>
            <button 
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-medium"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <div className="flex">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || 'An unexpected error occurred during import.'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => setStage('preview')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback (shouldn't reach here)
  return null;
}
