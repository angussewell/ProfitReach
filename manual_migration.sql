-- Manual migration to add multi-tenant contacts constraint

-- First, check if there are any duplicate emails within the same organization
SELECT email, "organizationId", COUNT(*) as count 
FROM "Contacts" 
WHERE email IS NOT NULL 
GROUP BY email, "organizationId" 
HAVING COUNT(*) > 1 
LIMIT 10;

-- If no duplicates, add the unique constraint
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_email_organizationId_key" UNIQUE (email, "organizationId");

-- Make organizationId column NOT NULL (should already be populated from backfill)
ALTER TABLE "Contacts" ALTER COLUMN "organizationId" SET NOT NULL;