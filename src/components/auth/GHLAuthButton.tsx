'use client';

import { generateAuthUrl } from '@/utils/auth';
import { useState } from 'react';

declare global {
  interface Window {
    GHLOAuth: {
      init: (config: {
        client_id: string;
        redirect_uri: string;
        scope: string;
      }) => void;
      login: () => void;
    };
  }
}

export function GHLAuthButton() {
  const [error, setError] = useState<string | null>(null);

  const handleAuth = () => {
    try {
      const authUrl = generateAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Auth error:', err);
      setError('Failed to initialize OAuth. Please try again later.');
    }
  };

  if (error) {
    return (
      <div className="text-center">
        <button
          onClick={handleAuth}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2"
        >
          Connect with GoHighLevel
        </button>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleAuth}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Connect with GoHighLevel
    </button>
  );
} 