-- Add emailAccountId column to SocialAccount table with a foreign key to EmailAccount
ALTER TABLE "public"."SocialAccount" ADD COLUMN "emailAccountId" TEXT REFERENCES "public"."EmailAccount"("id");

-- Create an index for better query performance
CREATE INDEX "SocialAccount_emailAccountId_idx" ON "public"."SocialAccount" ("emailAccountId"); 