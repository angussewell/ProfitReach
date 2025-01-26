'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  return (
    <Button
      onClick={() => signIn('gohighlevel')}
      className="bg-[#ff7a59] hover:bg-[#ff8f73] text-white"
    >
      Connect with GoHighLevel
    </Button>
  );
} 