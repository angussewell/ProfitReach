'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between mb-6", className)}
        {...props}
      >
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {children}
      </div>
    );
  }
);

PageHeader.displayName = "PageHeader";

export default PageHeader; 