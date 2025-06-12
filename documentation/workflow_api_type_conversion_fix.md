# Workflow API Type Conversion Fix

## Issue Summary

The workflow creation API (`POST /api/workflows`) was failing in the production environment with a 400 Bad Request error, while working correctly in the local development environment. The specific error was:

```
[WORKFLOWS-API] Zod validation failed: {
  "_errors": [],
  "dailyContactLimit": {
    "_errors": [
      "Expected number, received string"
    ]
  }
}
```

This indicates that the backend API expected `dailyContactLimit` to be a number, but received a string value, causing the Zod schema validation to fail.

## Root Cause

HTML input elements with `type="number"` return string values, not actual numbers. The form in the workflow settings component was using React Hook Form's `z.coerce.number()` for local validation, but wasn't properly converting the string value to a number before sending it to the API.

```tsx
// WorkflowSettings.tsx - Form schema using z.coerce.number()
dailyContactLimit: z.coerce.number().int().positive().optional().nullable(),

// But when sending to API, the raw form value was used without conversion
```

This discrepancy caused the issue to only appear in production because:
1. Local development may have had more lenient validation
2. Different browsers may handle number inputs differently
3. Production's strict validation was correctly rejecting the improperly typed data

## Solution

We implemented a two-part solution:

### 1. Immediate Fix for dailyContactLimit

We added explicit type conversion in the workflow page component when preparing the API payload:

```tsx
// Before
dailyContactLimit: finalSettingsData.dailyContactLimit || null,

// After
dailyContactLimit: finalSettingsData.dailyContactLimit 
  ? Number(finalSettingsData.dailyContactLimit) 
  : null,
```

### 2. Reusable Type Conversion Utility

To prevent similar issues in the future, we created a reusable utility in `src/lib/form-data-utils.ts` that handles form data type conversions for API submissions:

```typescript
// Prepares form data for API submission by converting strings to appropriate types
export function prepareFormDataForApi(
  formData: Record<string, any>,
  schema?: ConversionSchema
): Record<string, any> {
  // Implementation that converts strings to numbers, booleans, etc.
}

// Specific utility for workflow form data with predefined schema
export function prepareWorkflowFormData(formData: Record<string, any>): Record<string, any> {
  return prepareFormDataForApi(formData, {
    dailyContactLimit: 'number',
    // Add other workflow-specific fields needing conversion
  });
}
```

We then replaced the manual conversion with this utility:

```tsx
// Use our form-data-utils to handle data type conversions
const payload = prepareWorkflowFormData({
  ...finalSettingsData,
  steps: stepsForPayload,
});
```

## Benefits of the Solution

1. **Robust Type Handling**: The utility properly converts form values to the correct types expected by the API
2. **Centralized Logic**: Type conversion logic is now in one place, not scattered throughout components
3. **Extensible**: The schema-based approach makes it easy to add more field conversions as needed
4. **DRY Code**: Reduces repetitive type conversion code in components
5. **Debug-Friendly**: Added additional logging to help trace any similar issues in the future

## Prevention Measures

To prevent similar issues in the future:

1. Always use the form-data-utils when submitting form data to APIs
2. Add type conversion tests to verify API payloads have the correct types
3. Consider adding server-side logging that checks and reports type mismatches before validation fails
4. Add more detailed error messages in API responses to make debugging easier

## Related Files

- `src/app/(authenticated)/workflows/[workflowId]/page.tsx`
- `src/components/workflows/WorkflowSettings.tsx`
- `src/app/api/workflows/route.ts`
- `src/lib/form-data-utils.ts` (new)
