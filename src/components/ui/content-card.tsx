'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  noPadding?: boolean;
  contentClassName?: string;
}

const ContentCard = React.forwardRef<HTMLDivElement, ContentCardProps>(
  ({ className, title, children, noPadding = false, contentClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "technical-card",
          className
        )}
        {...props}
      >
        {title && (
          <div className="pb-4 border-b border-border/50">
            <h3 className="technical-header">{title}</h3>
          </div>
        )}
        <div
          className={cn(
            "flex flex-col",
            !noPadding && "p-4 space-y-4",
            contentClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

ContentCard.displayName = "ContentCard";

export { ContentCard }; 