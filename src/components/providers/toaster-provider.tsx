'use client';

import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { Toaster } from 'react-hot-toast';

export function ToasterProvider() {
  return (
    <React.Fragment>
      <SonnerToaster richColors position="top-right" />
      <ShadcnToaster />
      <Toaster position="top-right" />
    </React.Fragment>
  );
}
