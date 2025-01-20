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
    return new Date(dateStr).toLocaleString();
  };

  // Extract mapped fields and contact data
  const mappedFields = log.requestBody?.mappedFields || {};
  const contactData = log.requestBody?.contactData || {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#ff7a59] hover:text-[#ff957a] hover:bg-[#ff7a59]/10"
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
          <div className="grid grid-cols-2 gap-4">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
              <p className="text-base">{formatDate(log.createdAt)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
              <p className={`text-base ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
              </p>
            </div>

            {/* Scenario Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Scenario</h4>
              <p className="text-base">{mappedFields.scenarioName || log.scenarioName || 'N/A'}</p>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Contact Email</h4>
              <p className="text-base">{mappedFields.contactEmail || log.contactEmail || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Contact Name</h4>
              <p className="text-base">{mappedFields.contactName || log.contactName || 'N/A'}</p>
            </div>

            {/* Company Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Company</h4>
              <p className="text-base">{mappedFields.company || contactData.company || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Property Management Software</h4>
              <p className="text-base">{mappedFields.propertyManagementSoftware || contactData.PMS || 'N/A'}</p>
            </div>

            {/* Status Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Lead Status</h4>
              <p className="text-base">{mappedFields.leadStatus || contactData.lead_status || 'N/A'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Lifecycle Stage</h4>
              <p className="text-base">{mappedFields.lifecycleStage || contactData.lifecycle_stage || 'N/A'}</p>
            </div>

            {/* Error Message (if any) */}
            {log.errorMessage && (
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Error Message</h4>
                <p className="text-base text-red-600">{log.errorMessage}</p>
              </div>
            )}
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