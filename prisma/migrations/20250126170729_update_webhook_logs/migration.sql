/*
  Warnings:

  - Added the required column `ghlIntegrationId` to the `WebhookLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WebhookLog" ADD COLUMN     "ghlIntegrationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "WebhookLog_ghlIntegrationId_idx" ON "WebhookLog"("ghlIntegrationId");

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_ghlIntegrationId_fkey" FOREIGN KEY ("ghlIntegrationId") REFERENCES "GHLIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
