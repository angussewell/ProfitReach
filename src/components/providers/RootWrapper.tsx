'use client';

import { useEffect, useState } from 'react';

export default function RootWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <div className="min-h-screen bg-[#f5f8fa]">{children}</div>;
} 