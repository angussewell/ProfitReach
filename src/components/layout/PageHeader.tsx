import React from 'react';
import { Star, ChevronDown, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-gray-400" />
        <h1 className="text-xl font-medium text-[#33475b] flex items-center gap-2">
          {title}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="text-[#33475b] hover:text-[#33475b]/80">
          Create dashboard
        </Button>
        <Button variant="outline" size="sm" className="text-[#33475b] hover:text-[#33475b]/80">
          Actions
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
        <Button variant="outline" size="sm" className="text-[#33475b] hover:text-[#33475b]/80">
          Share
          <Share2 className="w-4 h-4 ml-1" />
        </Button>
        <Button variant="coral" size="sm" className="bg-[#ff7a59] hover:bg-[#ff8f73] text-white">
          Add report
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
} 