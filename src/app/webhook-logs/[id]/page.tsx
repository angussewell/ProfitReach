import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper to normalize field names for consistent lookup
function normalizeFieldName(field: string): string {
  return field.toLowerCase().trim();
}

export default async function WebhookLogPage({ params }: { params: { id: string } }) {
  const log = await prisma.webhookLog.findUnique({
    where: { id: params.id }
  });

  if (!log) {
    notFound();
  }

  const requestBody = log.requestBody as any;
  const mappedFields = requestBody?.mappedFields || {};
  
  // Helper to get mapped or fallback value
  const getFieldValue = (mappedKey: string, fallbackPath: string) => {
    const normalizedKey = normalizeFieldName(mappedKey);
    const mappedValue = mappedFields[normalizedKey];
    if (mappedValue) return mappedValue;
    
    // Try to get from contactData using fallback path
    const pathParts = fallbackPath.split('.');
    let value = requestBody;
    for (const part of pathParts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    return value || 'N/A';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Webhook Log Details</h1>
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {log.status || 'Unknown'}
          </div>
        </div>

        {/* Details Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Time - Always available from log */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <div className="text-sm font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Status - Always available from log */}
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
                  {getFieldValue('scenarioName', 'scenarioName') || log.scenarioName || 'N/A'}
                </div>
              </div>

              {/* Contact Email */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Contact Email</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('contactEmail', 'contactData.email') || log.contactEmail || 'N/A'}
                </div>
              </div>

              {/* Contact Name */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Contact Name</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('contactName', 'contactData.name') || log.contactName || 'N/A'}
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Company</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('company', 'contactData.company') || getFieldValue('company', 'contactData.company') || 'N/A'}
                </div>
              </div>

              {/* Property Management Software */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Property Management Software</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('propertyManagementSoftware', 'contactData.PMS')}
                </div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lead Status</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('leadStatus', 'contactData.lead_status') || getFieldValue('leadStatus', 'contactData.lead_status') || 'N/A'}
                </div>
              </div>

              {/* Lifecycle Stage */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lifecycle Stage</Label>
                <div className="text-sm font-medium">
                  {getFieldValue('lifecycleStage', 'contactData.lifecycle_stage') || getFieldValue('lifecycleStage', 'contactData.lifecycle_stage') || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raw Data Card */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Request Body</Label>
              <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {JSON.stringify(requestBody, null, 2)}
              </pre>
            </div>
            <div>
              <Label>Response Body</Label>
              <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {JSON.stringify(log.responseBody, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 