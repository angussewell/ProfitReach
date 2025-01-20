import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Define all possible fields with their display names and groups
const FIELD_DEFINITIONS = [
  { id: 'scenarioName', label: 'Scenario', group: 'scenario' },
  { id: 'status', label: 'Status', group: 'status' },
  { id: 'contactEmail', label: 'Contact Email', group: 'contact' },
  { id: 'contactName', label: 'Contact Name', group: 'contact' },
  { id: 'company', label: 'Company', group: 'company' },
  { id: 'propertyManagementSoftware', label: 'Property Management Software', group: 'company' },
  { id: 'leadStatus', label: 'Lead Status', group: 'status' },
  { id: 'lifecycleStage', label: 'Lifecycle Stage', group: 'status' }
];

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
  const contactInfo = extractContactInfo(requestBody);

  // Prepare all fields with values
  const fields = FIELD_DEFINITIONS.map(field => {
    let value = 'N/A';
    
    switch (field.id) {
      case 'status':
        value = log.status;
        break;
      case 'contactName':
        value = contactInfo.contactName;
        break;
      case 'company':
        value = contactInfo.company;
        break;
      case 'propertyManagementSoftware':
        value = contactInfo.propertyManagementSoftware;
        break;
      case 'leadStatus':
        value = contactInfo.leadStatus;
        break;
      case 'lifecycleStage':
        value = contactInfo.lifecycleStage;
        break;
      default:
        value = mappedFields[field.id] || 'N/A';
    }
    
    return { ...field, value };
  });

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

        {/* Field Display */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Timestamp */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <div className="text-sm font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              
              {/* All other fields */}
              {fields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-sm text-muted-foreground">{field.label}</Label>
                  <div className={cn(
                    "text-sm font-medium",
                    field.id === 'status' && (
                      field.value === 'success' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    )
                  )}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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