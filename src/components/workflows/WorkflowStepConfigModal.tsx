'use client';

import React, { useEffect, useState } from 'react'; // Added useState
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
// Keep Select imports for other fields
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, X, Check, ChevronsUpDown } from 'lucide-react'; // Added Check, ChevronsUpDown
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils'; // Import cn utility
// Add Combobox specific imports
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  UpdateFieldConfig, // Import specific config type
  ScenarioConfig // Import ScenarioConfig type
  // BranchConfig removed
} from '@/types/workflow';
// Remove incorrect/old imports if they exist
// import { ScenarioPicker } from './ScenarioPicker'; 
// import { ScenarioStepConfig } from './ScenarioStepConfig'; 
import { ScenarioMultiSelect } from './ScenarioMultiSelect'; // Correct import

// --- Helper Function ---
/**
 * Creates a deep clone of an object. Essential for immutable updates.
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Basic deep clone for JSON-serializable objects
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error("Deep clone failed:", e);
    // Fallback or throw error depending on requirements
    return obj; // Or handle more gracefully
  }
}

// Action type definitions - 'branch' removed
const actionTypes: ActionType[] = [
  'wait',
  'send_email',
  'update_field',
  'clear_field',
  'webhook',
  // 'branch', // Removed
  'remove_from_workflow',
  'scenario',
];

// actionTypeLabels - 'branch' removed
const actionTypeLabels: Record<ActionType, string> = {
  wait: 'Wait',
  send_email: 'Send Email',
  update_field: 'Update Field',
  clear_field: 'Clear Field',
  webhook: 'Webhook',
  // branch: 'Branch (Split)', // Removed
  remove_from_workflow: 'Remove From Workflow',
  scenario: 'Scenario',
};

import { getSimpleFieldOptions } from '@/lib/field-definitions';

// Use field paths from the centralized field definitions
const availableFieldPaths = getSimpleFieldOptions();

// Form schema
const stepFormSchema = z.object({
  actionType: z.enum([actionTypes[0], ...actionTypes.slice(1)]),
  customName: z.string().optional(),
  config: z.any(), // More specific validation is handled at the field level
});

type StepFormValues = z.infer<typeof stepFormSchema>;

// Separate component for webhook config to avoid rendering issues
function WebhookConfigFields({ stepForm }: { stepForm: any }) {
  // Run this effect once when the component mounts
  useEffect(() => {
    const currentUrl = stepForm.getValues('config.url');
    if (typeof currentUrl === 'number') {
      console.log('Fixing webhook URL value from number to empty string');
      // We need to do this after the render cycle
      setTimeout(() => {
        stepForm.setValue('config.url', '', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      }, 0);
    }
  }, [stepForm]);

  return (
    <>
      <FormField
        control={stepForm.control}
        name="config.url"
        render={({ field }) => {
          // Create a direct event handler instead of using field.onChange
          const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('Webhook URL onChange event fired:', e.target.value);
            field.onChange(e.target.value);
          };
          
          // Ensure value is a string
          const safeValue = field.value ? String(field.value) : '';
          
          return (
            <FormItem>
              <FormLabel>Webhook URL</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="https://your-webhook-url.com"
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                  value={safeValue}
                  onChange={handleChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <p className="text-sm text-muted-foreground mt-2">
        This webhook will use the POST method.
      </p>
    </>
  );
}

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
  // State for managing Popover open states (separate for each field)
  const [updateFieldPopoverOpen, setUpdateFieldPopoverOpen] = useState(false);
  const [clearFieldPopoverOpen, setClearFieldPopoverOpen] = useState(false);
  
  // Field-specific state variables for immediate visual feedback
  const [updateFieldLocalValue, setUpdateFieldLocalValue] = useState<string | null>(null);
  const [clearFieldLocalValue, setClearFieldLocalValue] = useState<string | null>(null);
  
  // State for forcing re-renders
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  // State for fetching scenarios (needed for the multi-select)
  const [fetchedScenarios, setFetchedScenarios] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);

  // Create a form instance with react-hook-form
  const stepForm = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      actionType: stepData?.actionType || 'wait',
      customName: stepData?.customName || '',
      config: stepData?.config || {},
    },
  });

  // Get current values from the form
  const actionType = stepForm.watch('actionType') as ActionType;
  const config = stepForm.watch('config') as StepConfig;

  // Define stable callback for ScenarioStepConfig
  const handleScenarioChange = React.useCallback((newScenarioIds: string[]) => {
    const assignmentType = newScenarioIds.length > 1 ? 'random_pool' : 'single';
    stepForm.setValue('config.scenarioIds', newScenarioIds, { shouldValidate: true });
    stepForm.setValue('config.assignmentType', assignmentType, { shouldValidate: true });
  }, [stepForm]); // Dependency: stepForm instance

  // Fetch scenarios when the modal is open (only needs to run once or when relevant props change)
  useEffect(() => {
    // Only fetch if the modal is open
    if (!isOpen) {
      // Optionally clear scenarios when modal closes to refetch next time
      // setFetchedScenarios([]); 
      return; 
    }

    async function fetchScenariosData() {
      // No need to check actionType here, fetch always if modal is open
      // We might optimize later to only fetch if actionType *could* be scenario
      setIsLoadingScenarios(true);
      try {
        const response = await fetch('/api/scenarios/simple');
        if (!response.ok) throw new Error('Failed to fetch scenarios');
        const data = await response.json();
        setFetchedScenarios(data.data || []);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        setFetchedScenarios([]); // Set to empty on error
      } finally {
        setIsLoadingScenarios(false);
      }
    }
    
    fetchScenariosData();
  }, [isOpen]); // Re-fetch if the modal re-opens

  // Update form when stepData prop changes (e.g., when opening modal for editing)
  useEffect(() => {
    if (isOpen && stepData) {
      stepForm.reset({
        actionType: stepData.actionType || 'wait',
        customName: stepData.customName || '',
        config: stepData.config || {},
      });
      
      // Also reset local state values to match form
      if (stepData.config && 'fieldPath' in stepData.config) {
        const fieldPath = stepData.config.fieldPath as string;
        if (stepData.actionType === 'update_field') {
          setUpdateFieldLocalValue(fieldPath);
        } else if (stepData.actionType === 'clear_field') {
          setClearFieldLocalValue(fieldPath);
        }
      }
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
      // Updated default for update_field
      case 'update_field': newConfig = { fieldPath: '', assignmentType: 'single', values: [''] }; break;
      case 'clear_field': newConfig = { fieldPath: '' }; break;
      case 'webhook': newConfig = { url: '', method: 'POST' }; break;
      // 'branch' case removed
      case 'remove_from_workflow': newConfig = {}; break;
      case 'scenario': newConfig = { assignmentType: 'single', scenarioIds: [] }; break;
    }

    stepForm.setValue('actionType', newType);
    stepForm.setValue('config', newConfig);
    
    // Reset local state values
    setUpdateFieldLocalValue(null);
    setClearFieldLocalValue(null);
  };

  // Handle form submission
  const onSubmit = (data: StepFormValues) => {
    // Ensure a deep copy of the config to break potential references from react-hook-form state
    let cleanConfig = deepClone(data.config);

    // Specific processing for update_field
    if (data.actionType === 'update_field') {
      // Ensure values is always an array and filter out empty strings
      const currentValues = Array.isArray(cleanConfig.values) ? cleanConfig.values : [cleanConfig.values || ''];
      // Add explicit type 'string' for v
      const filteredValues = currentValues.map((v: string) => String(v).trim()).filter((v: string) => v !== '');

      // If no valid values remain, default to a single empty string
      cleanConfig.values = filteredValues.length > 0 ? filteredValues : ['']; // Ensure at least one empty string if all were filtered

      // Automatically determine assignmentType based on the number of valid values
      if (cleanConfig.values.length > 1) {
        cleanConfig.assignmentType = 'random_pool';
      } else {
        cleanConfig.assignmentType = 'single';
        // Ensure values array has exactly one item for 'single' type
        cleanConfig.values = [cleanConfig.values[0] || '']; // Use the first item or default to empty string
      }
    }

    // Branch-specific processing removed

    console.log("Saving step with config:", cleanConfig);

    const stepToSave: WorkflowStep = {
      clientId: stepData?.clientId || uuidv4(),
      order: stepData?.order || existingSteps.length + 1, // Order will be recalculated by parent anyway
      actionType: data.actionType,
      config: cleanConfig, // Use the processed config
      customName: data.customName || '', // Include the custom name
    };
    onSave(stepToSave);
    onOpenChange(false); // Close modal on save
  };

  // Fetch scenarios useEffect REMOVED - Now handled in ScenarioStepConfig.tsx

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
                  {/* Keep using Select for this simple dropdown */}
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
      case 'update_field': {
        // Get current values array from form state
        const currentValues: string[] = Array.isArray(stepForm.getValues('config.values'))
          ? stepForm.getValues('config.values')
          : [String(stepForm.getValues('config.values') || '')];

        const addValueInput = () => {
          const newValues = [...currentValues, ''];
          stepForm.setValue('config.values', newValues, { shouldValidate: true });
        };

        const removeValueInput = (index: number) => {
          if (currentValues.length <= 1) return; // Keep at least one input
          const newValues = currentValues.filter((_, i) => i !== index);
          stepForm.setValue('config.values', newValues, { shouldValidate: true });
        };

        const updateValueInput = (index: number, value: string) => {
          const newValues = [...currentValues];
          newValues[index] = value;
          stepForm.setValue('config.values', newValues, { shouldValidate: true });
        };

        // Get field value or local value for rendering
        const displayFieldValue = updateFieldLocalValue || stepForm.getValues('config.fieldPath');
        const fieldPathLabel = displayFieldValue 
          ? availableFieldPaths.find(fp => fp.value === displayFieldValue)?.label
          : 'Select field...';

        return (
          <>
            {/* Field Path Combobox */}
            <FormField
              control={stepForm.control}
              name="config.fieldPath"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Field Path</FormLabel>
                  <Popover 
                    open={updateFieldPopoverOpen} 
                    onOpenChange={setUpdateFieldPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={updateFieldPopoverOpen}
                          className={cn(
                            "w-full justify-between",
                            !displayFieldValue && "text-muted-foreground"
                          )}
                          // Key based on update counter to force re-render
                          key={`update-field-btn-${forceUpdateCounter}`}
                        >
                          {fieldPathLabel}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command>
                        <CommandInput placeholder="Search field..." />
                        <CommandList>
                          <CommandEmpty>No field found.</CommandEmpty>
                          <CommandGroup>
                            {availableFieldPaths.map((fp) => (
                              <CommandItem
                                value={fp.label} // Use label for search filtering
                                key={fp.value}
                                onSelect={(currentValue) => {
                                  // Find the selected item by label
                                  const selectedItem = availableFieldPaths.find(
                                    item => item.label.toLowerCase() === currentValue.toLowerCase()
                                  );
                                  
                                  if (selectedItem) {
                                    // Update form value
                                    field.onChange(selectedItem.value);
                                    
                                    // Immediate visual feedback
                                    setUpdateFieldLocalValue(selectedItem.value);
                                    
                                    // Force component re-render
                                    setForceUpdateCounter(prev => prev + 1);
                                    
                                    // Explicitly trigger form validation
                                    setTimeout(() => {
                                      stepForm.trigger('config.fieldPath');
                                    }, 0);
                                  }
                                  
                                  // Close popover
                                  setUpdateFieldPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (fp.value === field.value || fp.value === updateFieldLocalValue)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {fp.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value Inputs */}
            <div className="space-y-2">
              <FormLabel>Value(s)</FormLabel>
              {currentValues.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      placeholder={`Enter value ${index + 1}`}
                      value={value}
                      onChange={(e) => updateValueInput(index, e.target.value)}
                    />
                  </FormControl>
                  {currentValues.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeValueInput(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {/* Limit adding more values for simplicity, e.g., max 5 */}
              {currentValues.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addValueInput}
                  className="mt-2 text-xs"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Value
                </Button>
              )}
            </div>
          </>
        );
      } // End case 'update_field'

      case 'clear_field': {
        // Get field value or local value for rendering
        const displayFieldValue = clearFieldLocalValue || stepForm.getValues('config.fieldPath');
        const fieldPathLabel = displayFieldValue
          ? availableFieldPaths.find(fp => fp.value === displayFieldValue)?.label
          : 'Select field...';
          
        return (
          // Field Path Combobox
          <FormField
            control={stepForm.control}
            name="config.fieldPath"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Field Path</FormLabel>
                <Popover 
                  open={clearFieldPopoverOpen} 
                  onOpenChange={setClearFieldPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clearFieldPopoverOpen}
                        className={cn(
                          "w-full justify-between",
                          !displayFieldValue && "text-muted-foreground"
                        )}
                        // Key based on update counter to force re-render
                        key={`clear-field-btn-${forceUpdateCounter}`}
                      >
                        {fieldPathLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command>
                      <CommandInput placeholder="Search field..." />
                      <CommandList>
                        <CommandEmpty>No field found.</CommandEmpty>
                        <CommandGroup>
                          {availableFieldPaths.map((fp) => (
                            <CommandItem
                              value={fp.label} // Use label for search filtering
                              key={fp.value}
                              onSelect={(currentValue) => {
                                // Find the selected item by label
                                const selectedItem = availableFieldPaths.find(
                                  item => item.label.toLowerCase() === currentValue.toLowerCase()
                                );
                                
                                if (selectedItem) {
                                  // Update form value
                                  field.onChange(selectedItem.value);
                                  
                                  // Immediate visual feedback
                                  setClearFieldLocalValue(selectedItem.value);
                                  
                                  // Force component re-render
                                  setForceUpdateCounter(prev => prev + 1);
                                  
                                  // Explicitly trigger form validation
                                  setTimeout(() => {
                                    stepForm.trigger('config.fieldPath');
                                  }, 0);
                                }
                                
                                // Close popover
                                setClearFieldPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  (fp.value === field.value || fp.value === clearFieldLocalValue)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fp.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      } // End case 'clear_field'

      case 'webhook':
        return <WebhookConfigFields stepForm={stepForm} />;

      // 'branch' case removed

      case 'remove_from_workflow':
        return <p className="text-sm text-muted-foreground">No configuration needed for this action.</p>;
        
      case 'scenario': {
        // Get current IDs directly from form state for passing as value
        const currentScenarioIds = stepForm.watch('config.scenarioIds') || [];
        
        return (
          // Use the new ScenarioMultiSelect component
          <ScenarioMultiSelect 
            scenarios={fetchedScenarios} 
            isLoading={isLoadingScenarios}
            value={currentScenarioIds} 
            onChange={handleScenarioChange} 
          />
          // We also need the info text below the select
          // TODO: Add the info text back if needed after confirming functionality
        );
      }

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
                  {/* Keep using Select for this */}
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
                      {/* Filtered actionTypes */}
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

            {/* Custom Name Field */}
            <FormField
              control={stepForm.control}
              name="customName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`${actionTypeLabels[actionType]} Step`}
                      {...field}
                    />
                  </FormControl>
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
