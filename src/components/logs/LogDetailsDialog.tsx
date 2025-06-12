import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDateInCentralTime } from '@/lib/date-utils';

interface WebhookLog {
  id: string;
  scenarioName: string;
  contactEmail: string;
  contactName?: string;
  status: string;
  errorMessage?: string;
  requestBody: any;
  responseBody?: any;
  createdAt: string;
}

interface LogDetailsDialogProps {
  log: WebhookLog;
}

export function LogDetailsDialog({ log }: LogDetailsDialogProps) {
  const formatJson = (json: any) => {
    return JSON.stringify(json, null, 2);
  };

  const formatDate = (dateStr: string) => {
    return formatDateInCentralTime(dateStr);
  };

  // Extract mapped fields and contact data
  const mappedFields = log.requestBody?.mappedFields || {};
  const contactData = log.requestBody?.contactData || {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="brand-gradient-warm" // Use the specific warm gradient
          size="sm"
        >
          <ScrollText className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webhook Log Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Time</Label>
              <div className="text-sm font-medium">
                {formatDate(log.createdAt)}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Status</Label>
              <div className={cn(
                "text-sm font-medium",
                log.status === 'success' ? 'text-green-600' : 'text-red-600'
              )}>
                {log.status || 'Unknown'}
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
                {contactData.company || 'N/A'}
              </div>
            </div>

            {/* Lead Status */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Lead Status</Label>
              <div className="text-sm font-medium">
                {contactData.lead_status || 'N/A'}
              </div>
            </div>

            {/* Lifecycle Stage */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Lifecycle Stage</Label>
              <div className="text-sm font-medium">
                {contactData.lifecycle_stage || 'N/A'}
              </div>
            </div>
          </div>

          {/* Raw Data */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Request Body</h4>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
              {formatJson(log.requestBody)}
            </pre>
          </div>

          {log.responseBody && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Response Body</h4>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {formatJson(log.responseBody)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
