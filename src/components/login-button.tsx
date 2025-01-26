'use client';

import { signIn } from 'next-auth/react';

export function LoginButton() {
  return (
    <button
      onClick={() => signIn('gohighlevel')}
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
    >
      Connect with GoHighLevel
    </button>
  );
} 