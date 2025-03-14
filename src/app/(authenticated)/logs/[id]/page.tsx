import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default async function WebhookLogPage({ params }: { params: { id: string } }) {
  const log = await prisma.webhookLog.findUnique({
    where: { id: params.id }
  });

  if (!log) {
    notFound();
  }

  const requestBody = log.requestBody as any;

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
                  {requestBody?.contactData?.company || 'N/A'}
                </div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lead Status</Label>
                <div className="text-sm font-medium">
                  {requestBody?.contactData?.lead_status || 'N/A'}
                </div>
              </div>

              {/* Lifecycle Stage */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lifecycle Stage</Label>
                <div className="text-sm font-medium">
                  {requestBody?.contactData?.lifecycle_stage || 'N/A'}
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