'use client';

import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        "container mx-auto px-6 py-8 max-w-7xl md:pl-[calc(60px+1.5rem)] transition-all duration-200",
        "sidebar-expanded:md:pl-[calc(260px+1.5rem)]",
        className
      )}>
        {children}
      </div>
    </div>
  )
} 