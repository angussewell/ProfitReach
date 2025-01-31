'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  noPadding?: boolean;
  contentClassName?: string;
}

const ContentCard = React.forwardRef<HTMLDivElement, ContentCardProps>(
  ({ className, title, children, noPadding = false, contentClassName, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "border-0 shadow-lg bg-white rounded-xl overflow-hidden",
          className
        )}
        {...props}
      >
        {title && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">{title}</h3>
          </div>
        )}
        <div
          className={cn(
            "flex flex-col",
            !noPadding && "p-6",
            contentClassName
          )}
        >
          {children}
        </div>
      </Card>
    );
  }
);

ContentCard.displayName = "ContentCard";

export default ContentCard; 