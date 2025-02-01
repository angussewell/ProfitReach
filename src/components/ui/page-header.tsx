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
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className={cn(
            "technical-header",
            variant === 'analytics' && "text-primary"
          )}>
            {title}
          </h1>
          {description && (
            <p className={cn(
              "technical-subheader max-w-2xl",
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