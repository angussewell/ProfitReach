'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  ActionType,
  WorkflowStep,
  StepConfig,
  BranchConfig
} from '@/types/workflow';

// Action type definitions
const actionTypes: ActionType[] = [
  'wait',
  'send_email',
  'update_field',
  'clear_field',
  'webhook',
  'branch',
  'remove_from_workflow',
];

const actionTypeLabels: Record<ActionType, string> = {
  wait: 'Wait',
  send_email: 'Send Email',
  update_field: 'Update Field',
  clear_field: 'Clear Field',
  webhook: 'Webhook',
  branch: 'Branch (Split)',
  remove_from_workflow: 'Remove From Workflow',
};

// Define available field paths based on Contacts model
const availableFieldPaths = [
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "fullName", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "emailStatus", label: "Email Status" },
  { value: "title", label: "Title" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "headline", label: "Headline" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
  { value: "currentCompanyName", label: "Company Name" },
  { value: "leadStatus", label: "Lead Status" },
  
  // Common additionalData fields
  { value: "additionalData.customTag", label: "Additional Data: Custom Tag" },
  { value: "additionalData.priorityScore", label: "Additional Data: Priority Score" },
  { value: "additionalData.source", label: "Additional Data: Source" },
  { value: "additionalData.notes", label: "Additional Data: Notes" },
  { value: "additionalData.campaignId", label: "Additional Data: Campaign ID" },
  { value: "additionalData.lastContactedDate", label: "Additional Data: Last Contacted Date" },
  { value: "additionalData.customerType", label: "Additional Data: Customer Type" },
  { value: "additionalData.segment", label: "Additional Data: Segment" },
];

// Form schema
const stepFormSchema = z.object({
  actionType: z.enum([actionTypes[0], ...actionTypes.slice(1)]),
  config: z.any(), // More specific validation is handled at the field level
});

type StepFormValues = z.infer<typeof stepFormSchema>;

interface WorkflowStepConfigModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  stepData: Partial<WorkflowStep> | null; // Data for editing or defaults for adding
  onSave: (stepData: WorkflowStep) => void;
  existingSteps: WorkflowStep[]; // For context, e.g., branch validation
  editingIndex: number | null; // null if adding new
}

export function WorkflowStepConfigModal({
  isOpen,
  onOpenChange,
  stepData,
  onSave,
  existingSteps,
  editingIndex,
}: WorkflowStepConfigModalProps) {
  // Create a form instance with react-hook-form
  const stepForm = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      actionType: stepData?.actionType || 'wait',
      config: stepData?.config || {},
    },
  });

  // Get current values from the form
  const actionType = stepForm.watch('actionType') as ActionType;
  const config = stepForm.watch('config') as StepConfig;

  // Update form when stepData prop changes (e.g., when opening modal for editing)
  useEffect(() => {
    if (isOpen && stepData) {
      stepForm.reset({
        actionType: stepData.actionType || 'wait',
        config: stepData.config || {},
      });
    }
  }, [isOpen, stepData, stepForm]);

  // Handle action type change and reset config accordingly
  const handleActionTypeChange = (value: string) => {
    const newType = value as ActionType;
    let newConfig = {};
    
    // Set default config based on action type
    switch (newType) {
      case 'wait': newConfig = { duration: 1, unit: 'days' }; break;
      case 'send_email': newConfig = { subjectOverride: '', scenarioId: '' }; break;
      case 'update_field': newConfig = { fieldPath: '', value: '' }; break;
      case 'clear_field': newConfig = { fieldPath: '' }; break;
      case 'webhook': newConfig = { url: '', method: 'POST' }; break;
      case 'branch': newConfig = { 
        type: 'percentage_split', 
        paths: [
          { weight: 50, nextStepOrder: 1 }, 
          { weight: 50, nextStepOrder: 1 }
        ] 
      }; break;
      case 'remove_from_workflow': newConfig = {}; break;
    }
    
    stepForm.setValue('actionType', newType);
    stepForm.setValue('config', newConfig);
  };

  // Handle form submission
  const onSubmit = (data: StepFormValues) => {
    const stepToSave: WorkflowStep = {
      clientId: stepData?.clientId || uuidv4(),
      order: stepData?.order || existingSteps.length + 1,
      actionType: data.actionType,
      config: data.config,
    };
    onSave(stepToSave);
  };

  // Dynamic config fields based on action type
  const renderConfigFields = () => {
    switch (actionType) {
      case 'wait':
        return (
          <>
            <FormField
              control={stepForm.control}
              name="config.duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value || 1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={stepForm.control}
              name="config.unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select
                    value={field.value || 'days'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'send_email':
        return (
          <>
            <FormField
              control={stepForm.control}
              name="config.scenarioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scenario ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Scenario ID or leave blank"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={stepForm.control}
              name="config.subjectOverride"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Override (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Override email subject or leave blank"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'update_field':
        return (
          <>
            <FormField
              control={stepForm.control}
              name="config.fieldPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Path</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a field to update..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableFieldPaths.map((fieldPath) => (
                        <SelectItem key={fieldPath.value} value={fieldPath.value}>
                          {fieldPath.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={stepForm.control}
              name="config.value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the value to set"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'clear_field':
        return (
          <FormField
            control={stepForm.control}
            name="config.fieldPath"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Field Path</FormLabel>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a field to clear..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableFieldPaths.map((fieldPath) => (
                      <SelectItem key={fieldPath.value} value={fieldPath.value}>
                        {fieldPath.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'webhook':
        return (
          <>
            <FormField
              control={stepForm.control}
              name="config.url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="https://your-webhook-url.com"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-sm text-muted-foreground mt-2">
              This webhook will use the POST method.
            </p>
          </>
        );
        
      case 'branch':
        // Get current paths from config
        const paths = (stepForm.watch('config.paths') || []).map((path: any, index: number) => ({
          ...path,
          index
        }));
        
        // Function to add a new path
        const addPath = () => {
          const currentPaths = [...paths];
          const remainingPercentage = 100 - currentPaths.reduce((sum: number, p: {weight: number | string}) => 
            sum + (parseInt(String(p.weight)) || 0), 0);
          const newWeight = Math.max(0, remainingPercentage);
          
          currentPaths.push({ weight: newWeight, nextStepOrder: 1 });
          stepForm.setValue('config.paths', currentPaths);
        };
        
        // Function to remove a path
        const removePath = (index: number) => {
          const currentPaths = [...paths];
          if (currentPaths.length <= 2) {
            // Don't allow fewer than 2 paths
            return;
          }
          
          const removedWeight = parseInt(currentPaths[index].weight) || 0;
          currentPaths.splice(index, 1);
          
          // Redistribute the removed weight to the first path
          if (removedWeight > 0 && currentPaths.length > 0) {
            const firstPathWeight = parseInt(currentPaths[0].weight) || 0;
            currentPaths[0].weight = firstPathWeight + removedWeight;
          }
          
          stepForm.setValue('config.paths', currentPaths);
        };
        
        // Calculate total percentage
        const totalPercentage = paths.reduce((sum: number, p: {weight: number | string}) => 
          sum + (parseInt(String(p.weight)) || 0), 0);
        const isValidTotal = totalPercentage === 100;
        
        return (
          <>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Percentage Split Paths</h4>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addPath}
                    className="text-xs"
                  >
                    Add Path
                  </Button>
                </div>
              </div>
              
              {!isValidTotal && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-sm">
                  Total percentage must equal exactly 100%. Current total: {totalPercentage}%
                </div>
              )}
              
              {paths.map((path: {weight: number | string, nextStepOrder: number | string, index: number}, index: number) => (
                <div key={index} className="flex flex-col gap-4 border p-3 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={stepForm.control}
                      name={`config.paths.${index}.weight`}
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormLabel>Path {index + 1} Weight (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              {...field}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                field.onChange(val);
                              }}
                              value={field.value || 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={stepForm.control}
                      name={`config.paths.${index}.nextStepOrder`}
                      render={({ field }) => (
                        <FormItem className="mb-0">
                          <FormLabel>Target Step Order</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                field.onChange(val);
                              }}
                              value={field.value || 1}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {paths.length > 2 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removePath(index)}
                      className="text-red-500 hover:text-red-700 self-end"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <p className="text-xs text-muted-foreground mt-2">
                Each path represents a percentage of contacts that will follow that route.
                The execution engine will randomly route contacts based on these weights.
              </p>
            </div>
          </>
        );
        
      case 'remove_from_workflow':
        return <p className="text-sm text-muted-foreground">No configuration needed for this action.</p>;
        
      default:
        return <p className="text-sm text-muted-foreground">Select an action type to configure.</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editingIndex !== null ? 'Edit Step' : 'Add New Step'}</DialogTitle>
          <DialogDescription>
            Configure the details for this workflow step.
          </DialogDescription>
        </DialogHeader>
        <Form {...stepForm}>
          <form onSubmit={stepForm.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              {/* Action Type Selector */}
              <FormField
                control={stepForm.control}
                name="actionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleActionTypeChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {actionTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {actionTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dynamic Config Fields */}
              {renderConfigFields()}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Step</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
