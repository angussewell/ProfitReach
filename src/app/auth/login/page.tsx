'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log(`Attempting login with email: ${email}`);
    
    try {
      const callbackUrl = searchParams?.get('callbackUrl') || '/scenarios';
      console.log(`Login callback URL: ${callbackUrl}`);
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('Login result:', result);

      if (result?.error) {
        console.error(`Login error: ${result.error}`);
        if (result.error.includes('database')) {
          setError('Unable to connect to the service. Please try again in a few moments.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } else if (result?.ok) {
        console.log(`Login successful, redirecting to: ${callbackUrl}`);
        router.push(callbackUrl);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again in a few moments.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="flex flex-col items-center space-y-8">
          <div className="relative w-48 h-12">
            <Image
              src="/TempShift Hero Logo Official.png"
              alt="TempShift"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          {error && (
            <div className="w-full p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  className="h-11 px-4"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className="h-11 px-4"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
