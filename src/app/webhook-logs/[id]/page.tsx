import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper function to extract contact info from request body
function extractContactInfo(requestBody: any) {
  const contactData = requestBody?.contactData || {};
  const firstName = contactData?.first_name || contactData?.["first_name"];
  const lastName = contactData?.last_name || contactData?.["last_name"];
  const company = contactData?.company || contactData?.["company"];
  const leadStatus = contactData?.lead_status || contactData?.["lead_status"];
  const lifecycleStage = contactData?.lifecycle_stage || contactData?.["lifecycle_stage"];
  
  return {
    contactName: [firstName, lastName].filter(Boolean).join(' ') || 'N/A',
    company: company || 'Not available',
    leadStatus: leadStatus || 'Empty',
    lifecycleStage: lifecycleStage || 'Unknown'
  };
}

export default async function WebhookLogPage({ params }: { params: { id: string } }) {
  const log = await prisma.webhookLog.findUnique({
    where: { id: params.id }
  });

  if (!log) {
    notFound();
  }

  const requestBody = log.requestBody as any;
  const contactInfo = extractContactInfo(requestBody);

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
                <Label>Scenario Name</Label>
                <div className="text-sm font-medium">{log.scenarioName}</div>
              </div>
              <div>
                <Label>Timestamp</Label>
                <div className="text-sm font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="pt-2 border-t">
                <Label>Pipeline Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Lead Status</div>
                    <div className="text-sm font-medium">
                      {contactInfo.leadStatus}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Lifecycle Stage</div>
                    <div className="text-sm font-medium">
                      {contactInfo.lifecycleStage}
                    </div>
                  </div>
                </div>
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
                <div className="text-sm font-medium">
                  {contactInfo.contactName}
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="text-sm font-medium">
                  {log.contactEmail}
                </div>
              </div>
              <div>
                <Label>Company</Label>
                <div className="text-sm font-medium">
                  {contactInfo.company}
                </div>
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
              {JSON.stringify(requestBody, null, 2)}
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