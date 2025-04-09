-- SQL script to fix models with missing defaults
-- This script would add the missing defaults to the database directly,
-- but we are using raw SQL in the API layer instead to avoid schema changes.

-- Note: This script is provided for reference only and should NOT be executed
-- unless a deliberate migration strategy is planned, since the current solution
-- uses $executeRaw in the API routes instead.

-- Add missing defaults to Prompt model
-- ALTER TABLE "Prompt" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
-- ALTER TABLE "Prompt" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- Add missing defaults to Snippet model
-- ALTER TABLE "Snippet" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
-- ALTER TABLE "Snippet" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- Add missing defaults to Attachment model
-- ALTER TABLE "Attachment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
-- ALTER TABLE "Attachment" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
