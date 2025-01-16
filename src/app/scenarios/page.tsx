'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScenariosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/scenarios/past');
  }, [router]);

  return null;
} 