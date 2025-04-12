# Workflow API Diagnostics & Fix

## Problem Summary

The workflow creation API (`POST /api/workflows`) works in local development but fails with a 400 Bad Request in production (Vercel). This documentation outlines the diagnostics implemented and the likely causes.

## Implemented Diagnostics

We've enhanced the codebase with diagnostics to identify and fix the issue:

1. **Enhanced Error Logging**: The `/api/workflows` route now has comprehensive logging for each step of the workflow creation process and more detailed error handling.

2. **Schema Validation Utilities**: A new `src/lib/schema-utils.ts` utility provides tools to:
   - Check if the database schema matches what's expected
   - Generate diagnostic SQL information
   - Test workflow creation without performing actual database insertions

3. **Diagnostic API Endpoint**: A new admin-only endpoint at `/api/debug/workflows` allows for:
   - Inspecting the database schema
   - Testing workflow payloads
   - Diagnosing SQL generation issues
   - Validating schema alignment

## Most Likely Causes

Based on analysis, the most probable causes for the 400 error are:

1. **Schema Mismatch**: The Prisma client in Vercel may be out of sync with the actual Neon database schema. This is especially likely given the constraint that schema changes require manual SQL followed by `npx prisma db pull && npx prisma generate`.

2. **Time Field Type Casting**: The SQL query uses PostgreSQL type casts for time fields (`::time`), which could fail in production if:
   - The time format differs between environments
   - Null handling is inconsistent
   - Schema changes modified the column types

3. **JSON/JSONB Handling**: The `steps` array is stringified and cast to `::jsonb`, which might be processed differently in production.

## Using the Diagnostic Tools

### Debugging in Production

1. Access the debug endpoint in the deployed environment:
   ```
   GET https://app.messagelm.com/api/debug/workflows?action=schema-check
   ```
   This will validate the database schema against expected types.

2. Test a workflow payload without creating it:
   ```
   POST https://app.messagelm.com/api/debug/workflows
   
   {
     "name": "Test Workflow",
     "steps": [...]
   }
   ```
   The response will show validation results and SQL generation diagnostics.

### Local Development

The same endpoints work locally:
```
GET http://localhost:3000/api/debug/workflows?action=schema-check
POST http://localhost:3000/api/debug/workflows
```

## Deployment Steps

1. Deploy the diagnostic improvements:
   - Enhanced error logging in `src/app/api/workflows/route.ts`
   - Schema utilities in `src/lib/schema-utils.ts`
   - Debug API endpoints in `src/app/api/debug/workflows/route.ts`

2. After deployment, use the diagnostic endpoint to identify the specific issue.

3. If schema mismatch is confirmed, sync the Prisma client with the database:
   ```bash
   npx prisma db pull
   npx prisma generate
   ```
   And redeploy the application.

4. If it's a time format issue, ensure all time values are consistently formatted as "HH:MM" and properly handled for null cases.

## Conclusion

The improved error handling and diagnostics in this update should provide clear visibility into why workflow creation fails in production while working in development. The most likely culprit is schema synchronization, which is particularly important in this project due to the requirement of using raw SQL for writes combined with regular Prisma client methods for reads.
