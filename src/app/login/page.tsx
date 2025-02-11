'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/scenarios';

  // Only allow redirects to our own domain
  const safeCallbackUrl = callbackUrl.startsWith('/') ? callbackUrl : '/scenarios';

  // Reset loading state after params are loaded
  useEffect(() => {
    setIsLoading(false);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    
    const formData = new FormData(e.currentTarget);
    try {
      console.log('Starting login attempt...');
      const result = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        callbackUrl: safeCallbackUrl,
        redirect: false  // Changed to false so we can handle the response
      });
      
      console.log('Login result:', { error: result?.error, ok: result?.ok, status: result?.status });
      
      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        window.location.href = safeCallbackUrl;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
    }
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-bold">Login</h1>
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 block w-full rounded-md border p-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            type="password"
            name="password"
            required
            className="mt-1 block w-full rounded-md border p-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Sign in
        </button>
      </form>
    </div>
  );
} 