'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function WebhookFieldsContent() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [testData, setTestData] = useState('');

  const syncStandardFields = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/webhook-fields/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'standard' })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully synced ${data.count} standard fields`);
      } else {
        toast.error('Failed to sync standard fields');
      }
    } catch (error) {
      toast.error('Error syncing fields');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncCustomFields = async () => {
    try {
      if (!testData) {
        toast.error('Please enter test webhook data');
        return;
      }

      const customFields = JSON.parse(testData);
      setIsSyncing(true);
      
      const response = await fetch('/api/webhook-fields/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'custom',
          customFields 
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully synced ${data.count} custom fields`);
      } else {
        toast.error('Failed to sync custom fields');
      }
    } catch (error) {
      toast.error('Invalid JSON data or sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Webhook Field Management</h1>
      
      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Standard Fields</h2>
          <p className="mb-4">
            Sync standard GoHighLevel fields like name, email, company, etc.
          </p>
          <button 
            onClick={syncStandardFields}
            disabled={isSyncing}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Standard Fields'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Fields</h2>
          <p className="mb-4">
            Paste a sample webhook payload to sync custom fields.
          </p>
          <textarea
            className="w-full h-32 p-2 border rounded mb-4 font-mono text-sm"
            placeholder="Paste JSON webhook data here..."
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
          />
          <button 
            onClick={syncCustomFields}
            disabled={isSyncing}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Custom Fields'}
          </button>
        </div>
      </div>
    </div>
  );
} 