import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { ComponentProps } from 'react';

// Create client-side components
const ClientImage = Image as React.ComponentType<ComponentProps<typeof Image>>;

export type TouchpointType = 
  | 'email' 
  | 'googleDrive' 
  | 'linkedin_message'
  | 'linkedin_commenter'
  | 'linkedin_connection'
  | 'research'
  | 'voicemail'
  | 'sms';

interface ScenarioTypeConfig {
  icon: string;
  bgColor: string;
  accentColor: string;
  iconBg: string;
  hoverBg: string;
  label: string;
  description: string;
  capabilities: string[];
}

const typeConfigs: Record<TouchpointType, ScenarioTypeConfig> = {
  email: {
    icon: '/Gmail_icon_(2020).svg.webp',
    bgColor: 'bg-gradient-to-br from-white to-red-50',
    accentColor: 'border-red-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-red-50/50',
    label: 'Email Agent',
    description: 'AI-powered email outreach that feels personal and human',
    capabilities: ['Smart Follow-ups', 'Smart Attachments']
  },
  googleDrive: {
    icon: '/google drive logo.webp',
    bgColor: 'bg-gradient-to-br from-white to-emerald-50',
    accentColor: 'border-emerald-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-emerald-50/50',
    label: 'Drive Agent',
    description: 'Intelligent document sharing with smart access control',
    capabilities: ['Smart Folders', 'Smart Documents']
  },
  linkedin_message: {
    icon: '/LinkedIn_icon.svg.png',
    bgColor: 'bg-gradient-to-br from-white to-blue-50',
    accentColor: 'border-blue-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-blue-50/50',
    label: 'LinkedIn Message Agent',
    description: 'AI-crafted LinkedIn messages that spark conversations',
    capabilities: ['Smart Replies', 'Post Sharing']
  },
  linkedin_commenter: {
    icon: '/LinkedIn_icon.svg.png',
    bgColor: 'bg-gradient-to-br from-white to-blue-50',
    accentColor: 'border-blue-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-blue-50/50',
    label: 'LinkedIn Engagement Agent',
    description: 'Intelligent post engagement that drives connections',
    capabilities: ['AI Comments', 'Content Analysis']
  },
  linkedin_connection: {
    icon: '/LinkedIn_icon.svg.png',
    bgColor: 'bg-gradient-to-br from-white to-blue-50',
    accentColor: 'border-blue-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-blue-50/50',
    label: 'LinkedIn Network Agent',
    description: 'Strategic network building with AI-powered targeting',
    capabilities: ['Smart Connect', 'Auto-Engage']
  },
  research: {
    icon: '/Perplexity-logo.png',
    bgColor: 'bg-gradient-to-br from-white to-violet-50',
    accentColor: 'border-violet-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-violet-50/50',
    label: 'Research Agent',
    description: 'Deep-dive research powered by advanced AI',
    capabilities: ['Company Intel', 'Prospect Intel']
  },
  voicemail: {
    icon: '/voicemail drop.png',
    bgColor: 'bg-gradient-to-br from-white to-pink-50',
    accentColor: 'border-pink-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-pink-50/50',
    label: 'Voicemail Agent',
    description: 'Human-like voicemails crafted by AI',
    capabilities: ['Voice Cloning', 'Tone Matching']
  },
  sms: {
    icon: '/iMessage-Logo.png',
    bgColor: 'bg-gradient-to-br from-white to-green-50',
    accentColor: 'border-green-100',
    iconBg: 'bg-white',
    hoverBg: 'hover:bg-green-50/50',
    label: 'SMS Agent',
    description: 'AI-powered text messages that feel natural',
    capabilities: ['Smart GIFs', 'Smart Attachments']
  }
};

interface ScenarioTypeSelectorProps {
  selectedType: TouchpointType | null;
  onTypeSelect: (type: TouchpointType) => void;
  className?: string;
}

export function ScenarioTypeSelector({
  selectedType,
  onTypeSelect,
  className
}: ScenarioTypeSelectorProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {(Object.entries(typeConfigs) as [TouchpointType, ScenarioTypeConfig][]).map(([type, config]) => (
        <button
          key={type}
          onClick={() => onTypeSelect(type)}
          className={cn(
            "relative p-6 rounded-xl border transition-all duration-300 text-left h-full",
            "backdrop-blur-sm backdrop-saturate-150",
            "group hover:scale-[1.02] hover:-translate-y-0.5",
            config.bgColor,
            config.accentColor,
            config.hoverBg,
            selectedType === type ? "ring-2 ring-primary ring-offset-2" : "",
            "overflow-hidden"
          )}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Glow effect */}
          <div className="absolute -inset-px bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />

          <div className="relative">
            <div className="flex items-start space-x-4">
              <div className={cn(
                "relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                config.iconBg,
                "shadow-lg"
              )}>
                <div className={cn(
                  "absolute",
                  type === 'sms' || type === 'voicemail' ? "inset-0.5" : "inset-2.5"
                )}>
                  <ClientImage
                    src={config.icon}
                    alt={config.label}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                  {config.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-600">
                  {config.description}
                </p>
                
                {/* Capability tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {config.capabilities.map((capability, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-600 group-hover:bg-gray-50 transition-colors duration-200 border border-gray-100 shadow-sm"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
} 