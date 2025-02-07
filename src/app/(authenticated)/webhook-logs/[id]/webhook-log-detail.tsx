'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WebhookLogDetailProps {
  log: {
    id: string;
    status: string;
    scenarioName: string;
    contactEmail: string;
    contactName: string;
    company: string;
    createdAt: Date;
    requestBody: Record<string, any>;
    responseBody: string;
  };
}

export default function WebhookLogDetail({ log }: WebhookLogDetailProps) {
  const [isRawDataExpanded, setIsRawDataExpanded] = React.useState(false);
  const requestData = log.requestBody as any;
  
  // Parse response body
  const responseData = React.useMemo(() => {
    try {
      return typeof log.responseBody === 'string' ? JSON.parse(log.responseBody) : log.responseBody;
    } catch (e) {
      console.error('Failed to parse response body:', e);
      return { error: 'Failed to parse response body' };
    }
  }, [log.responseBody]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Time */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <div className="text-sm font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className={cn(
                  "text-sm font-medium",
                  log.status === 'success' ? 'text-green-600' :
                  log.status === 'blocked' ? 'text-yellow-600' :
                  log.status === 'error' ? 'text-red-600' :
                  log.status === 'received' ? 'text-blue-600' :
                  log.status === 'testing' ? 'text-blue-600' :
                  'text-gray-600'
                )}>
                  {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                </div>
              </div>

              {/* Scenario */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Scenario</Label>
                <div className="text-sm font-medium">
                  {log.scenarioName || 'N/A'}
                </div>
              </div>

              {/* Contact Email */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Contact Email</Label>
                <div className="text-sm font-medium">
                  {log.contactEmail || 'N/A'}
                </div>
              </div>

              {/* Contact Name */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Contact Name</Label>
                <div className="text-sm font-medium">
                  {log.contactName || 'N/A'}
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Company</Label>
                <div className="text-sm font-medium">
                  {log.company || 'N/A'}
                </div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lead Status</Label>
                <div className="text-sm font-medium">
                  {requestData?.['Lead Status'] || 'N/A'}
                </div>
              </div>

              {/* Outbound Rep Name */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Outbound Rep Name</Label>
                <div className="text-sm font-medium">
                  {requestData?.['Outbound Rep Name'] || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message Card (if status is error) */}
        {log.status === 'error' && (
          <Card className="border-red-100">
            <CardHeader>
              <CardTitle className="text-red-600">Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-red-600">
                {responseData?.error || 'Unknown error'}
              </div>
              {responseData?.response && (
                <pre className="mt-2 p-4 bg-red-50 rounded-md text-sm whitespace-pre-wrap text-red-600">
                  {responseData.response}
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        {/* Raw Data Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Raw Data</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsRawDataExpanded(!isRawDataExpanded)}
            >
              {isRawDataExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isRawDataExpanded ? (
              <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {JSON.stringify(log.requestBody, null, 2)}
              </pre>
            ) : (
              <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-20 overflow-hidden">
                {JSON.stringify(log.requestBody, null, 2).slice(0, 200)}...
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 