'use client';

import { useSession } from 'next-auth/react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function OrgDebugPage() {
  const { data: session } = useSession();
  const { currentOrganization, organizations, loading, error, switchOrganization } = useOrganization();
  const [apiResults, setApiResults] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const runTest = async (orgId?: string) => {
    setApiLoading(true);
    setApiError(null);
    
    try {
      const url = orgId ? `/api/contacts/test?orgId=${orgId}` : '/api/contacts/test';
      const response = await fetch(url);
      const data = await response.json();
      setApiResults(data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    } finally {
      setApiLoading(false);
    }
  };
  
  // Run test automatically when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      runTest(currentOrganization.id);
    }
  }, [currentOrganization]);
  
  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold mb-6">Organization Debug Tool</h1>
      
      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-medium mb-4">Session Information</h2>
        <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
      
      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-medium mb-4">Organization Context</h2>
        <div className="mb-4">
          <div><strong>Current Organization:</strong> {currentOrganization ? `${currentOrganization.name} (${currentOrganization.id})` : 'None'}</div>
          <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
          <div><strong>Error:</strong> {error || 'None'}</div>
        </div>
        
        <h3 className="text-md font-medium mb-2">Available Organizations:</h3>
        <ul className="space-y-2">
          {organizations.map(org => (
            <li key={org.id} className="flex items-center gap-2">
              <span className={`${org.id === currentOrganization?.id ? 'font-bold' : ''}`}>
                {org.name} ({org.id})
              </span>
              <button 
                onClick={() => switchOrganization(org.id)}
                disabled={org.id === currentOrganization?.id}
                className={`px-2 py-1 text-xs rounded ${org.id === currentOrganization?.id ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
              >
                {org.id === currentOrganization?.id ? 'Current' : 'Switch'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mb-8 p-4 border rounded-md bg-gray-50">
        <h2 className="text-lg font-medium mb-4">Contact Test API</h2>
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => runTest(currentOrganization?.id)} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={apiLoading}
          >
            {apiLoading ? 'Loading...' : 'Run Test with Current Org'}
          </button>
          
          <button 
            onClick={() => runTest()} 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={apiLoading}
          >
            {apiLoading ? 'Loading...' : 'Run Test with Default Org (987 contacts)'}
          </button>
        </div>
        
        {apiError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            Error: {apiError}
          </div>
        )}
        
        {apiResults && (
          <div>
            <div className="mb-2"><strong>Total Contacts:</strong> {apiResults.totalContactsInDatabase}</div>
            <div className="mb-2"><strong>Contacts for Org:</strong> {apiResults.contactsForThisOrganization}</div>
            <div className="mb-2"><strong>Org ID Used:</strong> {apiResults.organizationId}</div>
            
            <h3 className="text-md font-medium mt-4 mb-2">All Organizations:</h3>
            <ul className="mb-4">
              {apiResults.allOrganizations?.map((org: any, index: number) => (
                <li key={index} className="mb-1">
                  {org.organizationId}: {org.count} contacts
                  {org.organizationId === currentOrganization?.id && ' (current)'}
                </li>
              ))}
            </ul>
            
            <h3 className="text-md font-medium mt-4 mb-2">Sample Contacts:</h3>
            {apiResults.sampleContacts?.length > 0 ? (
              <ul className="mb-4">
                {apiResults.sampleContacts.map((contact: any) => (
                  <li key={contact.id} className="mb-1">
                    {contact.firstName} {contact.lastName} ({contact.email})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No contacts found</p>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
