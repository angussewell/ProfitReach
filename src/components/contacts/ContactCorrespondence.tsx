'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mail, RefreshCw, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type CorrespondenceRecipient = {
  email: string;
  type: string;
  contactId: string | null;
};

type CorrespondenceMessage = {
  id: string;
  messageId: string;
  direction: 'inbound' | 'outbound';
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  eventTimestamp: string;
  emailAccountId: string | null;
  recipients: CorrespondenceRecipient[];
};

type CorrespondenceResponse = {
  contact: {
    id: string;
    name: string;
    email: string;
  };
  messages: CorrespondenceMessage[];
};

interface ContactCorrespondenceProps {
  contactId: string;
}

export default function ContactCorrespondence({
  contactId,
}: ContactCorrespondenceProps) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<CorrespondenceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const fetchCorrespondence = useCallback(async () => {
    const isInitialLoad = !hasLoaded.current;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/pipeline/contacts/${contactId}/correspondence`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = (await response.json()) as CorrespondenceResponse;
      setResponses(data);
      hasLoaded.current = true;
    } catch (err) {
      console.error('Failed to load correspondence:', err);
      setError('Unable to load correspondence history.');
      toast({
        title: 'Failed to load correspondence',
        description: 'Please try refreshing the correspondence tab.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    hasLoaded.current = false;
    setResponses(null);
    setError(null);
    setLoading(true);
  }, [contactId]);

  useEffect(() => {
    fetchCorrespondence();
  }, [fetchCorrespondence]);

  const hasMessages = useMemo(
    () => (responses?.messages?.length ?? 0) > 0,
    [responses?.messages?.length]
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading correspondence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" onClick={fetchCorrespondence}>
          Try again
        </Button>
      </div>
    );
  }

  if (!hasMessages) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <Mail className="h-6 w-6" />
        <p>No correspondence recorded for this contact yet.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCorrespondence}
          disabled={refreshing}
          className="mt-1 gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Viewing correspondence with{' '}
            <span className="font-medium text-foreground">
              {responses?.contact.name}
            </span>
            {responses?.contact.email && (
              <>
                {' '}
                &lt;
                <span className="font-mono text-xs">
                  {responses.contact.email}
                </span>
                &gt;
              </>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCorrespondence}
          disabled={refreshing}
          className="gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <ScrollArea className="max-h-[600px] rounded-lg border">
        <div className="space-y-4 p-4">
          {responses?.messages.map((message) => {
            const timestamp = new Date(message.eventTimestamp);
            const directionLabel =
              message.direction === 'inbound' ? 'Inbound' : 'Outbound';
            const DirectionIcon =
              message.direction === 'inbound' ? Reply : Mail;

            return (
              <Card
                key={message.id}
                className={cn(
                  'border-l-4',
                  message.direction === 'inbound'
                    ? 'border-l-emerald-500/70'
                    : 'border-l-blue-500/70'
                )}
              >
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          message.direction === 'inbound'
                            ? 'secondary'
                            : 'default'
                        }
                        className="gap-1"
                      >
                        <DirectionIcon className="h-3.5 w-3.5" />
                        {directionLabel}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {timestamp.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      Message ID: {message.messageId}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      From:{' '}
                      <span className="font-medium text-foreground">
                        {message.fromEmail || 'Unknown sender'}
                      </span>
                    </p>
                    {message.recipients.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        To:{' '}
                        <span className="font-medium text-foreground">
                          {message.recipients
                            .map((recipient) => recipient.email)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {message.subject && (
                    <h3 className="text-base font-semibold text-foreground">
                      {message.subject}
                    </h3>
                  )}

                  <div className="rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                    <div className="whitespace-pre-wrap">
                      {message.bodyText || 'No message content available.'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
