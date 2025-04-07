'use client';

import React, { useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { WorkflowMetadataFormData } from '@/types/workflow';

// Define Timezones (should ideally be shared or fetched)
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'UTC',
  // Add more as needed
];

// Zod schema for workflow metadata form validation (same as before)
const workflowMetadataFormSchema = z.object({
  name: z.string().min(1, { message: 'Workflow name is required.' }), // Keep for RHF, handled elsewhere
  description: z.string().optional().nullable(),
  dailyContactLimit: z.coerce.number().int().positive().optional().nullable(),
  dripStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid start time format (HH:mm)' }).optional().nullable(),
  dripEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid end time format (HH:mm)' }).optional().nullable(),
  timezone: z.string().optional().nullable(),
});

interface WorkflowSettingsProps {
  initialData: Partial<WorkflowMetadataFormData>;
  onFormInstanceReady: (form: UseFormReturn<WorkflowMetadataFormData>) => void;
  isParentLoading: boolean;
  isParentSaving: boolean;
}

export function WorkflowSettings({
  initialData,
  onFormInstanceReady,
  isParentLoading,
  isParentSaving,
}: WorkflowSettingsProps) {
  const form = useForm<WorkflowMetadataFormData>({
    resolver: zodResolver(workflowMetadataFormSchema),
    defaultValues: initialData,
  });

  useEffect(() => {
    onFormInstanceReady(form);
  }, [form, onFormInstanceReady]);

  useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const isDisabled = isParentLoading || isParentSaving;

  return (
    <Form {...form}>
      {/* No <form> tag here, submission handled by parent */}
      <div className="space-y-6 p-6"> {/* Keep p-6, adjust space-y if needed */}

        {/* --- General Settings --- */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional: Describe the purpose or goal of this workflow..."
                  {...field}
                  value={field.value ?? ''}
                  disabled={isDisabled}
                  rows={4}
                  className="resize-none" // Prevent resizing if desired
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dailyContactLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Daily Contact Limit</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 100"
                  {...field}
                  value={field.value ?? ''}
                  disabled={isDisabled}
                />
              </FormControl>
              <FormDescription>
                Maximum number of contacts to enroll or process per day. Leave blank for no limit.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-6" /> {/* Add separator */}

        {/* --- Time Settings --- */}
        <h3 className="text-lg font-medium mb-4">Schedule & Timezone</h3> {/* Section heading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Adjusted gap */}
          <FormField
            control={form.control}
            name="dripStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time" // HTML5 time input
                    {...field}
                    value={field.value ?? ''}
                    disabled={isDisabled}
                    className="appearance-none" // Improve consistency across browsers
                  />
                </FormControl>
                 <FormDescription>
                  Messages will only send after this time (24h format).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dripEndTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time" // HTML5 time input
                    {...field}
                    value={field.value ?? ''}
                    disabled={isDisabled}
                    className="appearance-none" // Improve consistency across browsers
                  />
                </FormControl>
                 <FormDescription>
                  Messages will only send before this time (24h format).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined} // Ensure value is string or undefined for Select
                defaultValue={field.value ?? undefined}
                disabled={isDisabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow timezone..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem> // Improve display
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Determines when the Start/End times are applied.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* No submit button here - handled by parent via header */}
      </div>
    </Form>
  );
}
