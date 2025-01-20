import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper function to extract contact info from request body
function extractContactInfo(requestBody: any) {
  const contactData = requestBody?.contactData || {};
  const mappedFields = requestBody?.mappedFields || {};
  
  // Extract from both contactData and mappedFields to ensure backward compatibility
  return {
    // Contact details
    contactName: mappedFields.contactName || [
      contactData?.first_name || contactData?.["first_name"],
      contactData?.last_name || contactData?.["last_name"]
    ].filter(Boolean).join(' ') || 'N/A',
    
    // Company details
    company: mappedFields.company || contactData?.company || contactData?.["company"] || 'Not available',
    propertyManagementSoftware: mappedFields.propertyManagementSoftware || 
      contactData?.pms || contactData?.["pms"] || 'Not specified',
    
    // Pipeline details
    leadStatus: mappedFields.leadStatus || 
      contactData?.lead_status || contactData?.["lead_status"] || 'Empty',
    lifecycleStage: mappedFields.lifecycleStage || 
      contactData?.lifecycle_stage || contactData?.["lifecycle_stage"] || 'Unknown'
  };
}

// Helper to format field name for display
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .split(/[._-\s]/)           // Split on delimiters
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize words
    .join(' ');
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

  // Group mapped fields by category
  const fieldGroups = {
    contact: ['contactName', 'contactEmail', 'contactFirstName', 'contactLastName'],
    company: ['company', 'propertyManagementSoftware'],
    status: ['leadStatus', 'lifecycleStage'],
    scenario: ['scenarioName']
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Webhook Log Details</h1>
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {log.status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Timestamp</Label>
                <div className="text-sm font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              
              {Object.entries(fieldGroups).map(([group, fields]) => (
                <div key={group} className="pt-2 border-t">
                  <Label>{formatFieldName(group)} Information</Label>
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {fields.map(field => mappedFields[field] && (
                      <div key={field}>
                        <div className="text-xs text-muted-foreground">
                          {formatFieldName(field)}
                        </div>
                        <div className="text-sm font-medium">
                          {mappedFields[field]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label>Webhook URL</Label>
                <div className="text-sm font-medium break-all">
                  {requestBody?.userWebhookUrl || 'Not provided'}
                </div>
              </div>
              {log.errorMessage && (
                <div className="pt-2 border-t">
                  <Label>Error Message</Label>
                  <div className="text-sm font-medium text-red-600">
                    {log.errorMessage}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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