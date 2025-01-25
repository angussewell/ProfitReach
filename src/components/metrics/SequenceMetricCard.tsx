'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SequenceMetricCardProps {
  name: string;
  replyRate: number;
  activeContacts: number;
  totalContacts: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: number;
}

export default function SequenceMetricCard({
  name,
  replyRate,
  activeContacts,
  totalContacts,
  trend,
  trendValue,
}: SequenceMetricCardProps) {
  const activeRate = (activeContacts / totalContacts) * 100;

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{name}</CardTitle>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
            ${trend === 'up' ? 'bg-brand-accent/10 text-brand-accent' : 
              trend === 'down' ? 'bg-red-100 text-red-700' : 
              'bg-gray-100 text-gray-700'}`}>
            {trend === 'up' ? (
              <ArrowUp className="w-4 h-4 mr-1" />
            ) : trend === 'down' ? (
              <ArrowDown className="w-4 h-4 mr-1" />
            ) : null}
            {trendValue}%
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Reply Rate</span>
            <span className="text-sm font-semibold text-brand-primary">{replyRate}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${replyRate}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">Active Contacts</span>
            <span className="text-sm font-semibold text-brand-accent">{activeRate.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ 
                width: `${activeRate}%`,
                background: 'linear-gradient(90deg, var(--brand-accent), var(--brand-accent-dark))'
              }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{activeContacts.toLocaleString()} active</span>
          <span>{totalContacts.toLocaleString()} total</span>
        </div>
      </CardContent>
    </Card>
  );
} 