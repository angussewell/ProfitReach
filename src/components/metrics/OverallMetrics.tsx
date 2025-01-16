'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, MessageCircle, Trophy } from 'lucide-react';

interface OverallMetricsProps {
  totalSequences: number;
  averageReplyRate: number;
  totalActiveContacts: number;
  bestPerformingSequence: {
    name: string;
    replyRate: number;
  };
}

export default function OverallMetrics({
  totalSequences,
  averageReplyRate,
  totalActiveContacts,
  bestPerformingSequence,
}: OverallMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
          <TrendingUp className="h-4 w-4 text-hubspot-orange group-hover:scale-110 transition-transform" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-hubspot-orange animate-float">
            {totalSequences}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total active sequences
          </p>
        </CardContent>
      </Card>

      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Average Reply Rate</CardTitle>
          <MessageCircle className="h-4 w-4 text-hubspot-teal group-hover:scale-110 transition-transform" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-hubspot-teal animate-float">
            {averageReplyRate}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Overall response rate
          </p>
        </CardContent>
      </Card>

      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
          <Users className="h-4 w-4 text-hubspot-blue group-hover:scale-110 transition-transform" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-hubspot-blue animate-float">
            {totalActiveContacts.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total contacts engaged
          </p>
        </CardContent>
      </Card>

      <Card className="group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Best Performing</CardTitle>
          <Trophy className="h-4 w-4 text-yellow-500 group-hover:scale-110 transition-transform" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-semibold text-hubspot-blue truncate">
            {bestPerformingSequence.name}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-yellow-500">
              {bestPerformingSequence.replyRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              reply rate
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 