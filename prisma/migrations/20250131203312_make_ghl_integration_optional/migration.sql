-- DropForeignKey
ALTER TABLE "WebhookLog" DROP CONSTRAINT "WebhookLog_ghlIntegrationId_fkey";

-- AlterTable
ALTER TABLE "WebhookLog" ALTER COLUMN "ghlIntegrationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_ghlIntegrationId_fkey" FOREIGN KEY ("ghlIntegrationId") REFERENCES "GHLIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
