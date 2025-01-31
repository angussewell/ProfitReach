'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex items-center justify-between mb-6",
      className
    )}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
        {title}
      </h1>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
} 