-- This SQL file contains the command to remove the unique constraint on scenario names
-- This allows multiple scenarios to have the same name within an organization

-- Drop the unique index that enforces name uniqueness within an organization
DROP INDEX "Scenario_name_organizationId_key";

-- Note: After running this command, you'll also need to update your Prisma schema
-- to remove the @@unique([name, organizationId]) constraint to match the database
