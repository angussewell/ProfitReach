'use client';

import type { StaticImageData } from 'next/image';
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
    <div className={cn(
      "relative h-10 flex items-center",
      open ? "justify-start pl-2" : "justify-center",
      className
    )}>
      <Image
        src={open ? '/MessageLM Hero.png' : '/MessageLM Icon.png'}
        alt="MessageLM"
        height={open ? 36 : 36}
        width={open ? 180 : 36}
        className="object-contain"
        priority
        unoptimized
      />
    </div>
  );
} 