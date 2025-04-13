'use client';

import * as React from 'react';
import { type LucideProps } from 'lucide-react';
import { Edit, Paperclip, FileText, MessageSquare, Clock, Copy } from 'lucide-react';
import { DuplicateScenarioDialog } from './DuplicateScenarioDialog';
import NextImage from 'next/image';
import NextLink from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ScenarioTypeCardProps {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  testMode?: boolean;
  isFollowUp?: boolean;
  createdAt?: Date;
  signature?: { name: string } | null;
  snippet?: { name: string } | null;
  attachment?: { name: string } | null;
  className?: string;
}

const IconWrapper = ({ icon: Icon, ...props }: { icon: React.ComponentType<LucideProps> } & LucideProps) => (
  <Icon {...props} />
);

const Image = React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<typeof NextImage>>((props, ref) => (
  <NextImage {...props} ref={ref} />
));
Image.displayName = 'Image';

const Link = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof NextLink>>((props, ref) => (
  <NextLink {...props} ref={ref} />
));
Link.displayName = 'Link';

const ScenarioTypeCard: React.FC<ScenarioTypeCardProps> = ({ 
  id, 
  name, 
  type, 
  description,
  testMode,
  isFollowUp,
  createdAt,
  signature,
  snippet,
  attachment,
  className 
}) => {
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = React.useState(false);

  const getTypeConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case 'linkedin':
      case 'linkedin_message':
      case 'linkedin_connection':
      case 'linkedin_commenter':
        return {
          icon: '/LinkedIn_icon.svg.png',
          bgColor: 'bg-[#0A66C2]/5',
          accentColor: 'border-[#0A66C2]/20',
          iconBg: 'bg-[#0A66C2]',
          hoverBg: 'hover:bg-[#0A66C2]/10',
          label: 'LinkedIn'
        };
      case 'research':
        return {
          icon: '/Perplexity-logo.png',
          bgColor: 'bg-[#0A66C2]/5',
          accentColor: 'border-[#0A66C2]/20',
          iconBg: 'bg-[#0A66C2]',
          hoverBg: 'hover:bg-[#0A66C2]/10',
          label: 'Research'
        };
      case 'email':
        return {
          icon: '/Gmail_icon_(2020).svg.webp',
          bgColor: 'bg-[#EA4335]/5',
          accentColor: 'border-[#EA4335]/20',
          iconBg: 'bg-[#EA4335]',
          hoverBg: 'hover:bg-[#EA4335]/10',
          label: 'Email'
        };
      case 'googledrive':
        return {
          icon: '/Gmail_icon_(2020).svg.webp',
          bgColor: 'bg-[#1FA463]/5',
          accentColor: 'border-[#1FA463]/20',
          iconBg: 'bg-[#1FA463]',
          hoverBg: 'hover:bg-[#1FA463]/10',
          label: 'Email About LinkedIn Post'
        };
      default:
        return {
          icon: '/Gmail_icon_(2020).svg.webp',
          bgColor: 'bg-gray-50',
          accentColor: 'border-gray-200',
          iconBg: 'bg-gray-100',
          hoverBg: 'hover:bg-gray-100',
          label: type
        };
    }
  };

  const config = getTypeConfig(type);

  return (
    <>
      <div
        className={cn(
          'group relative rounded-lg border-2 border-neutral-300 bg-white shadow-sm transition-all duration-200',
          config.bgColor,
          config.hoverBg,
          'hover:shadow-md',
          className
        )}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={cn('rounded-xl p-3', config.iconBg, 'bg-opacity-10')}>
                <Image
                  src={config.icon}
                  alt={`${config.label} icon`}
                  width={40}
                  height={40}
                  className="aspect-square object-contain"
                  priority
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <div className="flex gap-2">
                    {testMode && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Test Mode
                      </Badge>
                    )}
                    {isFollowUp && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Follow-up
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-500">{config.label}</p>
                {description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{description}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDuplicateModalOpen(true)}
                aria-label="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Link 
                href={`/settings/scenarios/${id}`} 
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <IconWrapper icon={Edit} className="w-4 h-4" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500 border-t pt-4">
            {createdAt && (
              <div className="flex items-center gap-2">
                <IconWrapper icon={Clock} className="w-4 h-4" />
                <span className="font-medium">Created {format(new Date(createdAt), 'MMM d, yyyy')}</span>
              </div>
            )}
            {signature && (
              <div className="flex items-center gap-2">
                <IconWrapper icon={MessageSquare} className="w-4 h-4" />
                <span className="font-medium">{signature.name}</span>
              </div>
            )}
            {snippet && (
              <div className="flex items-center gap-2">
                <IconWrapper icon={FileText} className="w-4 h-4" />
                <span className="font-medium">{snippet.name}</span>
              </div>
            )}
            {attachment && (
              <div className="flex items-center gap-2">
                <IconWrapper icon={Paperclip} className="w-4 h-4" />
                <span className="font-medium">{attachment.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isDuplicateModalOpen && (
        <DuplicateScenarioDialog
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          scenario={{ id, name }}
          refreshScenarios={() => window.location.reload()} // Replace with a prop if you want a smarter refresh
        />
      )}
    </>
  );
};

export { ScenarioTypeCard };
