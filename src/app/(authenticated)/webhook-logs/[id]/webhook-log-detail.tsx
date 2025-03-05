'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Mail, MessageSquare } from 'lucide-react';

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
    emailSubject?: string;
    emailHtmlBody?: string;
  };
}

export default function WebhookLogDetail({ log }: WebhookLogDetailProps) {
  const requestData = log.requestBody as any;
  
  // Debug logging
  console.log("Webhook log data in detail component:", log);
  console.log("Message fields available:", { 
    hasSubject: Boolean(log.emailSubject?.trim()), 
    hasBody: Boolean(log.emailHtmlBody?.trim()),
    subject: log.emailSubject,
    bodyLength: log.emailHtmlBody ? log.emailHtmlBody.length : 0
  });
  
  // Strengthen content detection logic to handle empty strings
  const hasMessageContent = Boolean(log.emailSubject?.trim()) || Boolean(log.emailHtmlBody?.trim());
  console.log("Has message content:", hasMessageContent);
  
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

        {/* Message Content Card */}
        {hasMessageContent ? (
          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardHeader className="flex flex-row items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              <CardTitle className="text-blue-600">Message Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {log.emailSubject && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Subject</Label>
                  <div className="text-lg font-semibold">{log.emailSubject}</div>
                </div>
              )}
              
              {log.emailHtmlBody && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Message Body</Label>
                  <div className="border p-4 rounded-md bg-white">
                    <div 
                      className="prose max-w-none" 
                      dangerouslySetInnerHTML={{ __html: log.emailHtmlBody }} 
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-yellow-50 border-2 border-yellow-200">
            <CardHeader className="flex flex-row items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-yellow-600" />
              <CardTitle className="text-yellow-600">No Message Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-700">
                This webhook log does not contain any message content. Visit the webhook logs list and find a log with message data.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Raw Data Card has been removed */}
      </div>
    </div>
  );
} 