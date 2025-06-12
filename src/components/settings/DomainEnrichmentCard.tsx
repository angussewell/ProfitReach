'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Utility to clean domain strings
const cleanDomain = (domain: string | null | undefined): string | null => {
  if (!domain) return null;
  let cleaned = domain.trim().toLowerCase();
  // Remove http(s):// and www. prefixes
  cleaned = cleaned.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
  // Remove trailing slash and anything after it
  cleaned = cleaned.split('/')[0];
  // Basic check for a dot, ignore if missing
  if (!cleaned.includes('.')) return null;
  return cleaned;
};


export function DomainEnrichmentCard() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [extractedDomains, setExtractedDomains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const resetState = () => {
    setFile(null);
    setFileName('');
    // Keep email? Maybe user wants to submit multiple files with same email. Let's keep it for now.
    // setEmail('');
    setHeaders([]);
    setSelectedColumn('');
    setParsedData([]);
    setExtractedDomains([]);
    setIsLoading(false);
    setError('');
    setSuccessMessage('');
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    resetState(); // Reset most state when a new file is selected
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('Invalid file type. Please upload a CSV file.');
        event.target.value = ''; // Clear the input
        return;
      }
      // Optional: Add file size check here
      // const maxSize = 10 * 1024 * 1024; // 10MB
      // if (selectedFile.size > maxSize) {
      //   setError('File is too large. Maximum size is 10MB.');
      //   event.target.value = ''; // Clear the input
      //   return;
      // }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      Papa.parse(selectedFile, {
        header: false, // We'll handle headers manually from the first row
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as string[];
            setHeaders(firstRow);
            setParsedData(results.data.slice(1)); // Store data excluding header row
            setSelectedColumn(''); // Reset column selection
            setExtractedDomains([]); // Reset domains
          } else {
            setError('CSV file appears to be empty or invalid.');
            resetState();
          }
          setIsLoading(false);
        },
        error: (err) => {
          console.error('CSV Parsing Error:', err);
          setError(`Failed to parse CSV: ${err.message}`);
          resetState();
          setIsLoading(false);
        },
      });
    } else {
      resetState();
    }
     // Clear the input value so the same file can be selected again after an error/reset
     event.target.value = '';
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError(''); // Clear error when user types
  };

  const handleColumnSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const column = event.target.value;
    setSelectedColumn(column);
    setError(''); // Clear error

    if (column && parsedData.length > 0 && headers.length > 0) {
      const columnIndex = headers.indexOf(column);
      if (columnIndex !== -1) {
        const domains = parsedData
          .map(row => cleanDomain(row[columnIndex]))
          .filter((domain): domain is string => domain !== null && domain !== ''); // Type guard
        setExtractedDomains(domains);
      } else {
        setExtractedDomains([]);
        setError('Selected column not found in data.');
      }
    } else {
      setExtractedDomains([]);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!file) {
      setError('Please upload a CSV file.');
      return;
    }
    if (!selectedColumn) {
      setError('Please select the column containing domain names.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
    }
    if (extractedDomains.length === 0) {
      setError('No valid domains found in the selected column. Please check the file or column selection.');
      return;
    }

    setIsLoading(true);

    const payload = {
      email: email.trim(),
      domains: extractedDomains,
    };

    try {
      const response = await fetch('https://n8n-n8n.swl3bc.easypanel.host/webhook/enrich-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Attempt to read error message from response body
        let errorMsg = 'Failed to submit domains for enrichment.';
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (parseError) {
            // Ignore if response body is not JSON or empty
        }
        throw new Error(`${errorMsg} (Status: ${response.status})`);
      }

      // Success
      setSuccessMessage(`Domain list submitted successfully! ${extractedDomains.length} domains sent. Enrichment results will be sent to ${email}.`);
      toast.success('Domain list submitted successfully!');
      // Reset form partially - keep email for potential next upload
      setFile(null);
      setFileName('');
      setHeaders([]);
      setSelectedColumn('');
      setParsedData([]);
      setExtractedDomains([]);

    } catch (error: any) {
      console.error('Error submitting domains:', error);
      setError(error.message || 'An unexpected error occurred during submission.');
      toast.error(error.message || 'Submission failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-[#2e475d] mb-4">Domain Enrichment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Upload a CSV file with domain names to enrich company data. Results will be sent to the email provided.
        </p>

        {/* Error and Success Messages */}
        {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
        {successMessage && <p className="text-sm text-green-700 bg-green-100 p-2 rounded-md">{successMessage}</p>}

        <div className="space-y-3">
          {/* File Input */}
          <div>
            <label htmlFor="domain-csv-file" className="block text-sm font-medium text-gray-700 mb-1">
              Upload CSV File *
            </label>
            <input
              id="domain-csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 disabled:opacity-50 disabled:pointer-events-none"
              disabled={isLoading}
            />
             {fileName && <p className="text-xs text-gray-500 mt-1">Selected file: {fileName}</p>}
          </div>

          {/* Email Input */}
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
              Your Email Address *
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email address"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:bg-gray-100"
              disabled={isLoading}
            />
             <p className="text-xs text-gray-500 mt-1">
                Enrichment results or notifications will be sent here.
              </p>
          </div>

          {/* Conditional Inputs: Column Selector */}
          {headers.length > 0 && (
            <div>
              <label htmlFor="domain-column" className="block text-sm font-medium text-gray-700 mb-1">
                Select Domain Column *
              </label>
              <select
                id="domain-column"
                value={selectedColumn}
                onChange={handleColumnSelect}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:bg-gray-100"
                disabled={isLoading}
              >
                <option value="" disabled>-- Select the column containing domains --</option>
                {headers.map((header, index) => (
                  <option key={index} value={header}>{header}</option>
                ))}
              </select>
              {selectedColumn && extractedDomains.length > 0 && (
                 <p className="text-xs text-green-600 mt-1">
                    Found {extractedDomains.length} valid domains in column "{selectedColumn}".
                 </p>
              )}
               {selectedColumn && extractedDomains.length === 0 && (
                 <p className="text-xs text-orange-600 mt-1">
                    No valid domains found in column "{selectedColumn}". Check column or file content.
                 </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={isLoading || !file || !selectedColumn || !email || !EMAIL_REGEX.test(email)}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                isLoading || !file || !selectedColumn || !email || !EMAIL_REGEX.test(email)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                'Submit for Enrichment'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
