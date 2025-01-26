import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FilterBuilder } from '@/components/filters/FilterBuilder';
import { getWebhookFields } from '@/lib/webhook-fields';
import { Filter } from '@/types/filters';
import { Prisma, Scenario } from '@prisma/client';

type ScenarioWithRelations = Omit<Scenario, 'filters'> & {
  filters: Prisma.JsonValue;
  signature: {
    id: string;
    signatureName: string;
    signatureContent: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  prompts: {
    id: string;
    name: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
};

export default async function ScenarioEditPage({ params }: { params: { id: string } }) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: params.id },
    include: {
      signature: true,
      prompts: true
    }
  }) as ScenarioWithRelations | null;

  if (!scenario) {
    notFound();
  }

  // Get available webhook fields for filtering
  const fields = await getWebhookFields();

  // Parse filters from JSON field
  let filters: Filter[] = [];
  try {
    const filtersJson = scenario.filters;
    filters = filtersJson ? (JSON.parse(String(filtersJson)) as Filter[]) : [];
  } catch (e) {
    console.error('Failed to parse filters:', e);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Edit Scenario: {scenario.name}</h1>

        <form action="/api/scenarios" method="POST" className="space-y-6">
          <input type="hidden" name="id" value={scenario.id} />
          
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={scenario.name}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  name="type"
                  defaultValue={scenario.scenarioType}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle>Webhook Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <input 
                type="hidden" 
                name="filters" 
                id="filters-json"
                value={JSON.stringify(filters)} 
              />
              <FilterBuilder
                initialFilters={filters}
                fields={fields}
                onChange={(newFilters) => {
                  const input = document.getElementById('filters-json') as HTMLInputElement;
                  input.value = JSON.stringify(newFilters);
                }}
              />
            </CardContent>
          </Card>

          {/* Email Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subjectLine">Subject Line</Label>
                <Input
                  id="subjectLine"
                  name="subjectLine"
                  defaultValue={scenario.subjectLine}
                />
              </div>

              <div>
                <Label htmlFor="customizationPrompt">Customization Prompt</Label>
                <Textarea
                  id="customizationPrompt"
                  name="customizationPrompt"
                  defaultValue={scenario.customizationPrompt || ''}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="emailExamplesPrompt">Email Examples Prompt</Label>
                <Textarea
                  id="emailExamplesPrompt"
                  name="emailExamplesPrompt"
                  defaultValue={scenario.emailExamplesPrompt || ''}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
} 