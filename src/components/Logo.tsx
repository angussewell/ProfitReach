'use client';

import type { StaticImageData } from 'next/image';
import NextImage from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

const Image = NextImage as any;

export function Logo({ className }: LogoProps) {
  const { open } = useSidebar();
  
  return (
    <div className={cn(
      "h-[52px] w-full flex items-center relative",
      open ? "pl-[10px]" : "justify-center",
      className
    )}>
      {/* Hero Logo */}
      <div 
        className={cn(
          "absolute transition-all duration-500 ease-in-out transform",
          open 
            ? "opacity-100 translate-x-0 scale-100" 
            : "opacity-0 -translate-x-4 scale-95"
        )}
      >
        <Image
          src="/MessageLM Hero.png"
          alt="MessageLM"
          width={280}
          height={50}
          className="h-[50px] w-[280px] object-contain object-left"
          priority
        />
      </div>

      {/* Icon Logo */}
      <div 
        className={cn(
          "transition-all duration-500 ease-in-out transform",
          open 
            ? "opacity-0 scale-90" 
            : "opacity-100 scale-100"
        )}
      >
        <Image
          src="/MessageLM Icon.png"
          alt="MessageLM"
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          priority
        />
      </div>
    </div>
  );
} 