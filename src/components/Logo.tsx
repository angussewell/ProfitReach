'use client';

import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { open } = useSidebar();
  
  // Preload both images
  useEffect(() => {
    const preloadImage = (src: string) => {
      const img = document.createElement('img');
      img.src = src;
    };
    
    preloadImage('/MessageLM Hero.png');
    preloadImage('/MessageLM Icon.png');
  }, []);
  
  return (
    <div className={cn("relative h-8 flex items-center justify-center", className)}>
      <Image
        src={open ? '/MessageLM Hero.png' : '/MessageLM Icon.png'}
        alt="MessageLM"
        height={32}
        width={open ? 160 : 32}
        className="object-contain"
        priority
        onError={(e) => {
          console.error('Failed to load logo:', e);
          // You could set a fallback here if needed
        }}
      />
    </div>
  );
} 