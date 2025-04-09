# Fixing the Scenario Name Uniqueness Constraint

This document outlines the solution to the 500 error issue when creating scenarios with duplicate names.

## Problem Description

When deploying to Vercel, the application was encountering 500 errors when trying to access pages, specifically when making API calls to `/api/organizations`. The root cause was a database constraint that enforced uniqueness of scenario names within the same organization. This constraint was causing internal server errors when users attempted to create scenarios with names that already exist.

## Solution Implemented

The solution involved two parts:

1. Removing the unique database constraint that enforced uniqueness on scenario names within an organization
2. Updating the Prisma schema to reflect this change

### 1. Database Changes

We removed the unique index on the Scenario table with the following SQL command:

```sql
DROP INDEX "Scenario_name_organizationId_key";
```

This allows multiple scenarios to have the same name within an organization.

### 2. Prisma Schema Update

We also updated the Prisma schema to remove the corresponding unique constraint:

```diff
- @@unique([name, organizationId])
+ // Unique constraint on name and organizationId removed to allow duplicate scenario names
```

## Deployment Instructions

To deploy this fix to production:

### 1. Apply the Database Change

Run the following SQL command on your production database:

```sql
DROP INDEX "Scenario_name_organizationId_key";
```

This can be executed via:
- Your database management tool (e.g., pgAdmin, DBeaver)
- A direct connection to your database server
- A database migration script

### 2. Deploy the Code Change

Ensure the updated Prisma schema is included in your deployment. You can deploy to Vercel using:

```bash
vercel deploy --prod
```

### 3. Verify the Fix

After deployment:
1. Verify that you can access the application without 500 errors
2. Test creating multiple scenarios with the same name to confirm the constraint has been removed

## Important Notes

- This change means that your database structure and Prisma schema will be in sync, but both will now diverge from what's defined in `schema.prisma`
- If you run Prisma migrations in the future, be careful as it might try to recreate the constraint
- Consider updating any application logic that might have assumed unique scenario names
