'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type PipelineContact = {
  id: string;
  name: string;
  email: string;
  leadStatus: string | null;
  threadId: string | null;
  lastActivityAt: string | null;
  updatedAt: string | null;
};

export default function PipelineClient() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<PipelineContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [disqualifyingId, setDisqualifyingId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading((prev) => prev && contacts.length === 0);
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/pipeline/contacts', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = (await response.json()) as PipelineContact[];
      setContacts(data);
    } catch (err) {
      console.error('Failed to load pipeline contacts:', err);
      setError('Unable to load pipeline contacts. Please try again.');
      toast({
        title: 'Failed to load contacts',
        description: 'Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contacts.length, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDisqualify = useCallback(
    async (contactId: string) => {
      setDisqualifyingId(contactId);
      try {
        const response = await fetch(
          `/api/pipeline/contacts/${contactId}/disqualify`,
          {
            method: 'POST',
          }
        );

        if (!response.ok) {
          throw new Error(`Disqualify failed (${response.status})`);
        }

        setContacts((prev) =>
          prev.filter((contact) => contact.id !== contactId)
        );

        toast({
          title: 'Contact disqualified',
          description: 'The contact has been removed from your pipeline.',
        });
      } catch (err) {
        console.error('Failed to disqualify contact:', err);
        toast({
          title: 'Unable to disqualify contact',
          description: 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setDisqualifyingId(null);
      }
    },
    [toast]
  );

  const hasContacts = useMemo(() => contacts.length > 0, [contacts.length]);

  return (
    <PageContainer>
      <PageHeader
        title="Pipeline"
        description="Review and manage contacts who have replied or are marked as connected."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContacts}
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
      </PageHeader>

      <div className="rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading pipeline contacts...
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" onClick={fetchContacts}>
              Try again
            </Button>
          </div>
        ) : !hasContacts ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <p>No connected contacts in your pipeline yet.</p>
            <p className="text-sm">
              New replies will appear here for quick follow-up and review.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Lead Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const isDisqualifying = disqualifyingId === contact.id;

                return (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {contact.leadStatus ?? 'Connected'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-w-[88px]"
                        >
                          <Link href={`/contacts/${contact.id}/edit`}>
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className={cn(
                            'min-w-[110px]',
                            isDisqualifying && 'opacity-80'
                          )}
                          disabled={isDisqualifying}
                          onClick={() => handleDisqualify(contact.id)}
                        >
                          {isDisqualifying ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Disqualifying…
                            </>
                          ) : (
                            'Disqualify'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </PageContainer>
  );
}
