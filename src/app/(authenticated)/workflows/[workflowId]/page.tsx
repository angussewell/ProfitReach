'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Removed useRef
import { useParams, useRouter } from 'next/navigation';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowDefinition } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { prepareWorkflowFormData } from '@/lib/form-data-utils';

// Shadcn UI for Settings Panel
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"; // Corrected import path if needed, assuming sheet exists
import { Button } from '@/components/ui/button';

// Import our refactored/new components
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';
// WorkflowStepConfigModal is rendered inside WorkflowBuilder, no need to import here
import { WorkflowEditorHeader } from '@/components/workflows/WorkflowEditorHeader';
import { WorkflowSettings } from '@/components/workflows/WorkflowSettings';
// ActionChooserModal and getDefaultConfigForAction imports already removed

import {
  WorkflowStep,
  WorkflowMetadataFormData,
  ActionType
  // BranchConfig removed
} from '@/types/workflow';

// Helper function to fetch workflow data (client-side) - Keep simulation for now
// TODO: Replace with actual API call
async function getWorkflowDefinition(id: string): Promise<(WorkflowDefinition & { steps?: WorkflowStep[] }) | null> {
  console.log("Fetching workflow data from API");
  const response = await fetch(`/api/workflows/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch workflow: ${response.statusText}`);
  }
  const apiResponse = await response.json();
  
  // Handle the new API response format that uses createApiResponse
  if (apiResponse.success && apiResponse.data) {
    console.log('Successfully fetched workflow data');
    const data = apiResponse.data;

  // --- SIMULATED FETCHED DATA (Fallback if API fails/not implemented) ---
  // const simulatedData: WorkflowDefinition & { steps?: any[] } = {
  //   workflowId: id,
  //   name: `Existing Workflow ${id.substring(0, 4)}`,
  //   description: 'This is an existing workflow description.',
  //   dailyContactLimit: 100,
  //   dripStartTime: new Date('1970-01-01T09:00:00Z'),
  //   dripEndTime: new Date('1970-01-01T17:00:00Z'),
  //   timezone: 'America/Chicago',
  //   organizationId: 'simulated-org-id',
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  //   isActive: true,
  //   steps: [
  //     { order: 1, actionType: 'wait', config: { duration: 1, unit: 'days' } },
  //     { order: 2, actionType: 'send_email', config: { scenarioId: 'initial-email-scenario' } },
  //     { order: 3, actionType: 'branch', config: { type: 'percentage_split', paths: [
  //       { weight: 60, nextStepOrder: 4 },
  //       { weight: 40, nextStepOrder: 6 }
  //     ]}},
  //     { order: 4, actionType: 'update_field', config: { fieldPath: 'leadStatus', value: 'High Priority' } },
  //     { order: 5, actionType: 'send_email', config: { scenarioId: 'priority-email' } },
  //     { order: 6, actionType: 'update_field', config: { fieldPath: 'leadStatus', value: 'Standard' } },
  //     { order: 7, actionType: 'webhook', config: { url: 'https://webhook.example.com', method: 'POST' } },
  //   ]
  // };
  // const data = simulatedData;
  // --- END SIMULATION ---

    // Parse and add client IDs to steps
    const parsedSteps = (data.steps || []).map((step: any, index: number) => ({
      ...step,
      clientId: uuidv4(), // Ensure client ID for React Flow
      order: step.order ?? index + 1,
      config: step.config || {},
      // Add explicit types to sort parameters
    })).sort((a: { order: number }, b: { order: number }) => a.order - b.order);

    console.log('Steps data updated:', parsedSteps);
    return { ...data, steps: parsedSteps };
  } else {
    // Handle case when success is false or data is missing
    if (apiResponse.error) {
      throw new Error(`API Error: ${apiResponse.error}`);
    }
    return null;
  }
}

// Helper to format Prisma Time (DateTime) to HH:mm string
const formatTime = (date: Date | string | null | undefined): string | undefined => {
  if (!date) return undefined;
  const d = new Date(date); // Handle both Date objects and ISO strings
  if (isNaN(d.getTime())) return undefined;
  // Use local time formatting based on the input potentially being just HH:mm
  // If it's a full date, getUTC might be needed depending on how it's stored/retrieved
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  // Check if the input was likely just time, otherwise use UTC if it was a full date
  if (typeof date === 'string' && date.includes('T')) {
      const utcHours = d.getUTCHours().toString().padStart(2, '0');
      const utcMinutes = d.getUTCMinutes().toString().padStart(2, '0');
      return `${utcHours}:${utcMinutes}`;
  }
  return `${hours}:${minutes}`;
};


export default function WorkflowEditPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.workflowId as string;
  const isCreating = workflowId === 'new';

  const [isLoading, setIsLoading] = useState(!isCreating);
  const [isSaving, setIsSaving] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowName, setWorkflowName] = useState(''); // State for header input
  const [initialSettingsData, setInitialSettingsData] = useState<Partial<WorkflowMetadataFormData>>({});

  // State tracking is now handled by the WorkflowBuilder component via useWorkflowState

  // Action Chooser Modal state removed

  // State for Settings Panel (Sheet)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State to hold the WorkflowSettings form instance
  const [settingsFormInstance, setSettingsFormInstance] = useState<UseFormReturn<WorkflowMetadataFormData> | null>(null);

  // --- Helper Functions for Steps Removed (Now handled within WorkflowBuilder/useWorkflowState) ---

  // --- Data Loading Effect ---

  useEffect(() => {
    if (!isCreating) {
      setIsLoading(true);
      const fetchWorkflow = async () => {
        try {
          // Use the actual fetch function now
          const data = await getWorkflowDefinition(workflowId);

          if (data) {
            setWorkflowName(data.name); // Set header name state
            const formattedMetadata = {
              name: data.name, // Keep name here for initial form data
              description: data.description,
              dailyContactLimit: data.dailyContactLimit ?? undefined,
              dripStartTime: formatTime(data.dripStartTime),
              dripEndTime: formatTime(data.dripEndTime),
              timezone: data.timezone,
            };
            setInitialSettingsData(formattedMetadata); // Set data for WorkflowSettings component
            setSteps(data.steps || []);
          } else {
            toast.error('Workflow not found.');
            router.push('/workflows');
          }
        } catch (error) {
          console.error('Failed to fetch workflow:', error);
          toast.error('Failed to load workflow data.');
          // Don't redirect immediately, allow user to see the error
          // router.push('/workflows');
        } finally {
          setIsLoading(false);
        }
      };
      fetchWorkflow();
    } else {
      // Default values for new workflow
      setWorkflowName('');
      setInitialSettingsData({
        name: '', // Start with empty name
        description: '',
        dailyContactLimit: undefined,
        dripStartTime: undefined,
        dripEndTime: undefined,
        timezone: undefined,
      });
      setSteps([]);
      setIsLoading(false); // No loading needed for 'new'
    }
  }, [workflowId, isCreating, router]);

  // --- Unified Save Function ---
  const handleSaveWorkflow = useCallback(async () => {
    setIsSaving(true);

    // Get current settings data from the WorkflowSettings form via state
    if (!settingsFormInstance) {
      toast.error("Settings form instance not ready."); // Updated error message
      setIsSaving(false);
      return;
    }

    // Trigger validation manually if needed, or rely on getValues
    // await settingsFormInstance.trigger(); // Optional: show validation errors in sheet
    const settingsData = settingsFormInstance.getValues();

    // Ensure the name from the header state is included and validated
    if (!workflowName || workflowName.trim() === '') {
        toast.error("Workflow name cannot be empty.");
        setIsSaving(false);
        // Optionally focus the header input
        return;
    }

    const finalSettingsData = {
      ...settingsData,
      name: workflowName.trim(), // Use the trimmed name from the header state
    };

    const apiUrl = isCreating ? '/api/workflows' : `/api/workflows/${workflowId}`;
    const method = isCreating ? 'POST' : 'PUT';

      // Prepare payload: Combine validated settings and steps from the builder
      // The `steps` state here might be slightly behind the builder's internal state
      // if `onSaveChanges` hasn't fired yet. Rely on the builder's state for the save.
      // We need a way for the builder to expose its current steps for saving.
      // Let's modify `onSaveChanges` in WorkflowBuilder to pass the steps.

      // For now, we'll use the page's `steps` state, but this needs refinement.
      // TODO: Refactor WorkflowBuilder to pass its current steps via onSaveChanges
      const stepsForPayload = steps.map(({ clientId, ...rest }) => rest);

      // Use our form-data-utils to handle data type conversions
      const payload = prepareWorkflowFormData({
        ...finalSettingsData,
        steps: stepsForPayload,
      });
      
      // Additional logging for debugging
      console.log('DEBUG: Final payload with converted data types:', payload);

    // --- DEBUG LOGGING ---
    console.log(
      'DEBUG: Attempting to Save Workflow:',
      {
        workflowId: workflowId, // Log the actual ID from params
        isCreating: isCreating, // Log the boolean flag result
        determinedMethod: method, // Log the method chosen
        determinedApiUrl: apiUrl, // Log the URL chosen
        payloadBeingSent: payload // Log the data payload
      }
    );
    // --- END DEBUG LOGGING ---

    try {
      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to ${isCreating ? 'create' : 'update'} workflow`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      toast.success(`Workflow successfully ${isCreating ? 'created' : 'updated'}!`);

      if (isCreating && result.workflowId) {
        // If creating, redirect to the new edit page to prevent duplicate creation
        router.replace(`/workflows/${result.workflowId}`); // Use replace to avoid back button issues
      } else if (!isCreating) {
        // If updating, update the initial settings data to reflect saved state
        setInitialSettingsData(finalSettingsData);
        // Optionally refetch or just assume success
      }
      setIsSettingsOpen(false); // Close settings panel on successful save

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'An unexpected error occurred during save.');
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, isCreating, router, steps, workflowName, settingsFormInstance]); // Updated dependency

  // --- Render Logic ---

  // Show loader only when editing existing and actively loading
  if (isLoading && !isCreating) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading Workflow...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/40"> {/* Ensure parent takes full height */}
      <WorkflowEditorHeader
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        onToggleSettings={() => setIsSettingsOpen(true)}
        onSave={handleSaveWorkflow}
        onCancel={() => router.push('/workflows')}
        isSaving={isSaving}
        isLoading={isLoading}
        isCreating={isCreating}
      />

      {/* Main Content Area - Builder takes remaining space */}
      {/* Pass workflowId and simplified props to WorkflowBuilder */}
      <div className="flex-1 overflow-hidden p-1 md:p-2">
        {/* Render WorkflowBuilder only when not loading */}
        {!isLoading && (
          <WorkflowBuilder
            workflowId={workflowId} // Pass the workflowId
            steps={steps} // Pass initial/current steps
            onSaveChanges={setSteps} // Update page state when builder saves internally
          />
        )}
        {/* Optional: Show a loader inside the builder area while loading */}
        {isLoading && (
           <div className="flex justify-center items-center h-full">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
        )}
      </div>

      {/* Settings Panel (Sheet) */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col"> {/* Adjust width and make flex column */}
          <SheetHeader className="mb-4"> {/* Reduced margin */}
            <SheetTitle>Workflow Settings</SheetTitle>
            <SheetDescription>
              Configure the general settings for this workflow. Changes are saved when you click the main 'Save Workflow' button.
            </SheetDescription>
          </SheetHeader>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto pr-6"> {/* Added padding-right for scrollbar */}
            <WorkflowSettings
              initialData={initialSettingsData}
              onFormInstanceReady={setSettingsFormInstance} // Pass the callback
              isParentLoading={isLoading}
              isParentSaving={isSaving}
            />
          </div>
           <SheetFooter className="mt-auto pt-4 border-t">
             <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Close</Button>
             {/* No save button here, handled by header */}
           </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Step Configuration Modal is rendered within the WorkflowBuilder component */}
      {/* ActionChooserModal removed */}
    </div>
  );
}
