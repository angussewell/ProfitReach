import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getWebhookFields } from '@/lib/webhook-fields';
import { Filter } from '@/types/filters';
import { ScenarioEditForm } from '@/components/scenarios/ScenarioEditForm';
import { Scenario } from '@prisma/client';
import { PageContainer } from '@/components/layout/PageContainer';

type ScenarioWithRelations = Omit<Scenario, 'filters'> & {
  filters: string;
  testMode: boolean;
  testEmail: string | null;
  signature: {
    id: string;
    name: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  snippet: {
    id: string;
    name: string;
    content: string;
  } | null;
  attachment: {
    id: string;
    name: string;
  } | null;
};

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ScenarioEditPage({ params }: Props) {
  // Await params before using
  const resolvedParams = await params;
  
  if (!resolvedParams?.id) {
    notFound();
  }

  const scenario = await prisma.scenario.findUnique({
    where: { id: resolvedParams.id },
    include: {
      signature: {
        select: {
          id: true,
          name: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      },
      snippet: {
        select: {
          id: true,
          name: true,
          content: true
        }
      },
      attachment: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }) as ScenarioWithRelations | null;

  if (!scenario) {
    notFound();
  }

  // Get available webhook fields for filtering
  const fields = await getWebhookFields();

  // Get available snippets and attachments
  const snippets = await prisma.snippet.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  const attachments = await prisma.attachment.findMany({
    select: {
      id: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Parse filters from JSON field with robust error handling
  let filters: Filter[] = [];
  try {
    if (scenario.filters) {
      // Handle both string and object formats
      const filtersData = typeof scenario.filters === 'string' 
        ? JSON.parse(scenario.filters)
        : scenario.filters;
      
      if (Array.isArray(filtersData)) {
        filters = filtersData;
      } else if (typeof filtersData === 'object') {
        console.warn('Scenario filters is an object, initializing empty array');
        filters = [];
      } else {
        console.warn('Scenario filters is not an array or object:', filtersData);
        filters = [];
      }
    }
  } catch (e) {
    console.error('Failed to parse filters:', e);
    // Initialize with empty array if parsing fails
    filters = [];
  }

  return (
    <PageContainer>
      <ScenarioEditForm
        scenario={{
          ...scenario,
          filters
        }}
        fields={fields}
        snippets={snippets}
        attachments={attachments}
      />
    </PageContainer>
  );
} 