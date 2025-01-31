'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  noPadding?: boolean;
  contentClassName?: string;
}

export function ContentCard({
  children,
  className,
  title,
  noPadding = false,
  contentClassName
}: ContentCardProps) {
  return (
    <Card
      className={cn(
        "border border-gray-100/50 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-xl overflow-hidden",
        className
      )}
    >
      {title && (
        <CardHeader className="pb-4 border-b border-gray-100/50">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        noPadding ? 'p-0' : 'p-6 space-y-4',
        contentClassName
      )}>
        {children}
      </CardContent>
    </Card>
  );
} 