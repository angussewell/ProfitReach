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
  const mappedFields = requestBody?.mappedFields || {};
  const contactData = requestBody?.contactData || {};

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Webhook Log Details</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label>Status</Label>
                <div className={cn(
                  "text-sm font-medium",
                  log.status === 'success' ? 'text-green-600' : 'text-red-600'
                )}>
                  {log.status}
                </div>
              </div>
              <div>
                <Label>Timestamp</Label>
                <div className="text-sm">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <Label>Scenario Name</Label>
                <div className="text-sm">{log.scenarioName}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label>Contact Name</Label>
                <div className="text-sm">{mappedFields.contactName || 'Not available'}</div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="text-sm">{log.contactEmail}</div>
              </div>
              <div>
                <Label>Company</Label>
                <div className="text-sm">{mappedFields.company || 'Not available'}</div>
              </div>
              <div>
                <Label>Lead Status</Label>
                <div className="text-sm">{mappedFields.leadStatus || 'Not available'}</div>
              </div>
              <div>
                <Label>Lifecycle Stage</Label>
                <div className="text-sm">{mappedFields.lifecycleStage || 'Not available'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {log.errorMessage && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Error Message</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-red-600 whitespace-pre-wrap">
                {log.errorMessage}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request Body</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(log.requestBody, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Body</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(log.responseBody, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 