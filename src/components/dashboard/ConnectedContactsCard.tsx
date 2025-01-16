'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ConnectedContactsCard() {
  const { data: session } = useSession();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch('/api/hubspot/contacts/count');
        if (!response.ok) {
          throw new Error('Failed to fetch contact count');
        }
        const data = await response.json();
        setCount(data.total);
      } catch (err) {
        console.error('Error fetching contact count:', err);
        setError('Failed to load contact count');
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      fetchCount();
    }
  }, [session]);

  if (!session) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-300 border-none">
      <h3 className="text-base font-medium text-gray-700 mb-4">Connected Contacts</h3>
      <div className="flex items-center">
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="h-12 w-24 bg-gray-100 rounded"></div>
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="space-y-4 w-full">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-hubspot-orange">{count?.toLocaleString()}</span>
              <span className="text-sm text-gray-500">Total Connected</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-hubspot-orange rounded-full transition-all duration-500"
                style={{ width: `${Math.min((count || 0) / 10000 * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 