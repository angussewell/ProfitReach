'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa, { ParseResult, ParseError } from 'papaparse';
import { SearchableSelect } from '@/components/ui/searchable-select';

// Define the stages of import process
type ImportStage = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete' | 'error';

// Group labels for field categories
const FIELD_GROUPS = {
  PERSONAL: 'Personal Information',
  CONTACT: 'Contact Information',
  COMPANY: 'Company Information',
  SOCIAL: 'Social Media',
  LOCATION: 'Location',
  SYSTEM: 'System Fields',
  CUSTOM: 'Custom Fields',
  OTHER: 'Other Fields'
};

// Contact field options for mapping, organized by logical groups
const CONTACT_FIELDS = [
  // Personal Information
  { value: "firstName", label: "First Name", group: FIELD_GROUPS.PERSONAL },
  { value: "lastName", label: "Last Name", group: FIELD_GROUPS.PERSONAL },
  { value: "fullName", label: "Full Name", group: FIELD_GROUPS.PERSONAL },
  { value: "photoUrl", label: "Photo URL", group: FIELD_GROUPS.PERSONAL },
  { value: "headline", label: "Headline/Bio", group: FIELD_GROUPS.PERSONAL },
  { value: "title", label: "Job Title", group: FIELD_GROUPS.PERSONAL },
  
  // Contact Information
  { value: "email", label: "Email Address", group: FIELD_GROUPS.CONTACT },
  { value: "emailStatus", label: "Email Status", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.main", label: "Phone Number (Main)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.mobile", label: "Phone Number (Mobile)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.work", label: "Phone Number (Work)", group: FIELD_GROUPS.CONTACT },
  { value: "phoneNumbers.other", label: "Phone Number (Other)", group: FIELD_GROUPS.CONTACT },
  
  // Company Information
  { value: "currentCompanyName", label: "Company Name", group: FIELD_GROUPS.COMPANY },
  { value: "currentCompanyId", label: "Company ID", group: FIELD_GROUPS.COMPANY },
  { value: "companyWebsiteUrl", label: "Company Website", group: FIELD_GROUPS.COMPANY },
  { value: "companyLinkedinUrl", label: "Company LinkedIn URL", group: FIELD_GROUPS.COMPANY },
  
  // Social Media
  { value: "linkedinUrl", label: "LinkedIn URL", group: FIELD_GROUPS.SOCIAL },
  { value: "twitterUrl", label: "Twitter URL", group: FIELD_GROUPS.SOCIAL },
  { value: "facebookUrl", label: "Facebook URL", group: FIELD_GROUPS.SOCIAL },
  { value: "githubUrl", label: "GitHub URL", group: FIELD_GROUPS.SOCIAL },
  
  // Location
  { value: "city", label: "City", group: FIELD_GROUPS.LOCATION },
  { value: "state", label: "State/Province", group: FIELD_GROUPS.LOCATION },
  { value: "country", label: "Country", group: FIELD_GROUPS.LOCATION },
  
  // System Fields
  { value: "leadStatus", label: "Lead Status", group: FIELD_GROUPS.SYSTEM },
  
  // JSON/Complex Fields
  { value: "additionalData.tag", label: "Tag (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.source", label: "Source (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.score", label: "Score (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.notes", label: "Notes (Custom Field)", group: FIELD_GROUPS.CUSTOM },
  { value: "additionalData.customField", label: "Custom Field", group: FIELD_GROUPS.CUSTOM },
  
  // Other Fields
  { value: "employmentHistory", label: "Employment History", group: FIELD_GROUPS.OTHER },
  { value: "contactEmails", label: "Additional Emails", group: FIELD_GROUPS.OTHER },
  { value: "", label: "Ignore this column", group: FIELD_GROUPS.OTHER }
];

// Group contact fields by category for the UI
const GROUPED_CONTACT_FIELDS = Object.values(FIELD_GROUPS).map(group => ({
  group,
  fields: CONTACT_FIELDS.filter(field => field.group === group)
}));

// Flatten the grouped fields for the search
const FLAT_CONTACT_FIELDS = CONTACT_FIELDS.map(field => ({
  value: field.value,
  label: `${field.label} (${field.group})`
}));

// Required fields for validation
const REQUIRED_FIELDS = ["email"];

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportContactsModal({ isOpen, onClose }: ImportContactsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [stage, setStage] = useState<ImportStage>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    successCount: number;
    errorCount: number;
    errors: any[];
  } | null>(null);
  
  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setStage('upload');
    setCsvData([]);
    setHeaders([]);
    setMappings({});
    setError(null);
    setImportResults(null);
    onClose();
  }, [onClose]);
  
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
  
  // Handle the final import
  const handleImport = async () => {
    setStage('importing');
    setError(null);
    
    try {
      // Transform all data according to the mappings
      const contacts = csvData.map(transformRow);
      
      // Submit to the API
      const response = await fetch('/api/contacts/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to import contacts');
      }
      
      setImportResults(result);
      setStage('complete');
      
      // Refresh the contacts list
      router.refresh();
    } catch (err) {
      console.error('Error importing contacts:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
                      <SearchableSelect
                        options={FLAT_CONTACT_FIELDS}
                        value={mappings[header] || ""}
                        onChange={(value) => {
                          setMappings(prev => ({ ...prev, [header]: value }));
                        }}
                        placeholder="Select or search for a field..."
                        emptyMessage="No matching fields found"
                      />
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
                <div className="mt-2 text-sm text-green-700">
                  <p>Successfully imported {importResults.successCount} contacts.</p>
                </div>
              </div>
            </div>
          </div>
          
          {importResults.errorCount > 0 && (
            <div className="bg-yellow-50 p-4 rounded-md mb-4">
              <div className="flex">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Attention needed</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>{importResults.errorCount} rows had errors and were not imported.</p>
                    
                    {importResults.errors.length > 0 && (
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {importResults.errors.map((error, index) => (
                          <li key={index}>{error.message || error}</li>
                        ))}
                      </ul>
                    )}
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
