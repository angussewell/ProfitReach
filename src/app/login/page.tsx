'use client';

import { LoginForm } from './login-form';
import React from 'react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <React.Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
} 