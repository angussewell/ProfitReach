'use client';

import { ScenarioWizard } from '@/components/scenarios/ScenarioWizard'
import { PageContainer } from '@/components/layout/PageContainer'

export default function CreateScenarioPage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold text-[#2e475d] mb-6">Create New Scenario</h1>
      <ScenarioWizard />
    </PageContainer>
  )
} 