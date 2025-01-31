import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getWebhookFields } from '@/lib/webhook-fields';
import { Filter } from '@/types/filters';
import { ScenarioEditForm } from '@/components/scenarios/ScenarioEditForm';
import { Scenario } from '@prisma/client';

type ScenarioWithRelations = Omit<Scenario, 'filters'> & {
  filters: string;
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
    url: string;
  } | null;
};

export default async function ScenarioEditPage({ params }: { params: { id: string } }) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: params.id },
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
          name: true,
          url: true
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

  // Parse filters from JSON field
  let filters: Filter[] = [];
  try {
    filters = scenario.filters ? JSON.parse(scenario.filters) as Filter[] : [];
  } catch (e) {
    console.error('Failed to parse filters:', e);
  }

  return (
    <div className="p-6">
      <ScenarioEditForm
        scenario={{
          ...scenario,
          filters
        }}
        fields={fields}
        snippets={snippets}
        attachments={attachments}
      />
    </div>
  );
} 