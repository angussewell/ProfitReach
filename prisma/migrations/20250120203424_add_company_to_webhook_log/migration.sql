/*
  Warnings:

  - You are about to drop the column `errorMessage` on the `WebhookLog` table. All the data in the column will be lost.
  - Made the column `contactName` on table `WebhookLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `responseBody` on table `WebhookLog` required. This step will fail if there are existing NULL values in that column.

*/
-- Drop existing table
DROP TABLE IF EXISTS "WebhookLog";

-- Create new table with all fields
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'error',
    "scenarioName" TEXT NOT NULL DEFAULT 'Unknown',
    "contactEmail" TEXT NOT NULL DEFAULT 'Unknown',
    "contactName" TEXT NOT NULL DEFAULT 'Unknown',
    "company" TEXT NOT NULL DEFAULT 'Unknown',
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX "WebhookLog_scenarioName_idx" ON "WebhookLog"("scenarioName");

-- Update existing records
UPDATE "WebhookLog"
SET "contactName" = 'Unknown'
WHERE "contactName" IS NULL;

UPDATE "WebhookLog"
SET "responseBody" = '{}'::jsonb
WHERE "responseBody" IS NULL;

-- Make columns required with defaults
ALTER TABLE "WebhookLog" ALTER COLUMN "status" SET DEFAULT 'error';
ALTER TABLE "WebhookLog" ALTER COLUMN "scenarioName" SET DEFAULT 'Unknown';
ALTER TABLE "WebhookLog" ALTER COLUMN "contactEmail" SET DEFAULT 'Unknown';
ALTER TABLE "WebhookLog" ALTER COLUMN "contactName" SET DEFAULT 'Unknown';
ALTER TABLE "WebhookLog" ALTER COLUMN "responseBody" SET DEFAULT '{}'::jsonb;

-- Drop errorMessage column
ALTER TABLE "WebhookLog" DROP COLUMN IF EXISTS "errorMessage";
