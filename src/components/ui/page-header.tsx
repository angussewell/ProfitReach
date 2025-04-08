'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'analytics';
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  variant = 'default'
}: PageHeaderProps) {
  return (
    <div className={cn(
      "mb-8",
      variant === 'analytics' && "bg-gradient-to-br from-primary/5 to-primary/10 p-8 rounded-lg border border-primary/10",
      className
    )}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"> {/* Adjusted flex for responsiveness */}
        <div className="space-y-1.5">
          <h1 className={cn(
            "text-2xl font-bold tracking-tight", // Standard heading style
            variant === 'analytics' ? "text-primary" : "text-foreground" // Use theme colors
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "text-sm text-muted-foreground max-w-2xl", // Standard subheader style
              variant === 'analytics' && "text-primary/60"
            )}>
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
