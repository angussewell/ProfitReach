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

  const payload = log.payload as any;
  
  return (
    <div className="p-6 space-y-6">
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
                  'text-red-600'
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
                  {payload?.contactName || 'N/A'}
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Company</Label>
                <div className="text-sm font-medium">
                  {payload?.company || 'N/A'}
                </div>
              </div>

              {/* Lead Status */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lead Status</Label>
                <div className="text-sm font-medium">
                  {payload?.leadStatus || 'N/A'}
                </div>
              </div>

              {/* Lifecycle Stage */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Lifecycle Stage</Label>
                <div className="text-sm font-medium">
                  {payload?.lifecycleStage || 'N/A'}
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
          <CardContent>
            <pre className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 