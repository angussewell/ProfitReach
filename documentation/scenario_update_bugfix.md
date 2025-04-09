# Scenario API Update Bugfix

## Problem Description

When updating a Scenario via the PUT `/api/scenarios/[id]` endpoint, certain fields were not being persisted to the database despite being included in the request body and the frontend showing a success message. Specifically:

- The Scenario's name (Title) was not being saved
- Boolean toggle fields like `isFollowUp`, `isHighPerforming`, and `testMode` were not being updated
- Other fields such as `description`, `status`, `attachmentId`, etc. were potentially affected

Meanwhile, certain fields *were* being properly saved:
- `customizationPrompt`
- `emailExamplesPrompt` 
- `signatureId`
- `subjectLine`
- `filters`

## Root Cause

The issue was isolated to the PUT handler in `src/app/api/scenarios/[id]/route.ts`. The handler was only destructuring and handling a small subset of the available fields from the request body:

```typescript
// Previously, only these fields were being destructured
const { customizationPrompt, emailExamplesPrompt, signatureId, subjectLine, filters } = data;

// And only these fields were being added to updateData
const updateData: any = {};
if (customizationPrompt !== undefined) updateData.customizationPrompt = customizationPrompt;
if (emailExamplesPrompt !== undefined) updateData.emailExamplesPrompt = emailExamplesPrompt;
if (signatureId !== undefined) updateData.signatureId = signatureId || null;
if (subjectLine !== undefined) updateData.subjectLine = subjectLine;
if (filters !== undefined) updateData.filters = filters;
```

This meant that other fields present in the frontend form and the Scenario model (`name`, `isFollowUp`, etc.) were being ignored during updates, even when they were included in the request body.

## Solution Implemented

The fix involved:

1. Expanding the destructuring to include ALL fields from the Scenario model
2. Adding corresponding conditionals to add each field to the update data object
3. Special handling for boolean fields to ensure proper type conversion
4. Adding logging to assist with future debugging

```typescript
// Now destructuring all relevant fields
const { 
  name, 
  description, 
  status, 
  signatureId, 
  customizationPrompt, 
  emailExamplesPrompt, 
  attachmentId, 
  isFollowUp, 
  snippetId, 
  subjectLine, 
  touchpointType, 
  filters, 
  testEmail, 
  testMode,
  isHighPerforming 
} = data;

// Adding conditionals for all fields
// Text/string fields
if (name !== undefined) updateData.name = name;
if (description !== undefined) updateData.description = description;
// ... (and so on for all fields)

// Boolean fields with type conversion
if (isFollowUp !== undefined) updateData.isFollowUp = Boolean(isFollowUp);
if (testMode !== undefined) updateData.testMode = Boolean(testMode);
if (isHighPerforming !== undefined) updateData.isHighPerforming = Boolean(isHighPerforming);
```

## Additional Debugging Enhancements

Two console.log statements were added to assist with future debugging:

```typescript
// Log the entire incoming request body
console.log("API PUT /api/scenarios/[id] - Received Body:", data);

// Log the data object being passed to Prisma's update method
console.log("API PUT /api/scenarios/[id] - Data passed to prisma.update:", updateData);
```

These logs will help identify any potential issues with incoming data from the frontend or how the data is being transformed before being passed to Prisma.

## Fields Now Properly Handled

The update now correctly handles all fields in the Scenario model:

| Field Type | Fields |
|------------|--------|
| Text/String | `name`, `description`, `status`, `customizationPrompt`, `emailExamplesPrompt`, `subjectLine`, `touchpointType`, `testEmail` |
| References | `signatureId`, `attachmentId`, `snippetId` |
| Booleans | `isFollowUp`, `testMode`, `isHighPerforming` |
| JSON | `filters` |

## Type Safety Improvements

Boolean fields now use `Boolean()` conversion to ensure they are stored as true booleans regardless of how they're represented in the request (string "true"/"false", actual boolean values, etc.)

Reference fields (like `signatureId`) maintain the fallback to null with `|| null` to ensure a valid value is always stored.
