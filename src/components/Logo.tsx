'use client';

import type { StaticImageData } from 'next/image';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const Image = dynamic(() => import('next/image'), { ssr: true }) as any;

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
      <div className="relative w-full h-full">
        <div 
          className={cn(
            "absolute inset-0 flex items-center transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src="/MessageLM Hero.png"
            alt="MessageLM Hero"
            height={36}
            width={180}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            open ? "opacity-0" : "opacity-100"
          )}
        >
          <Image
            src="/MessageLM Icon.png"
            alt="MessageLM Icon"
            height={36}
            width={36}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  );
} 