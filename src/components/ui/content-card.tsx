'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContentCard = React.forwardRef<HTMLDivElement, ContentCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);

ContentCard.displayName = 'ContentCard'; 