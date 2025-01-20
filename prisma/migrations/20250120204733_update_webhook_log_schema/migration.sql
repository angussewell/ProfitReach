/*
  Warnings:

  - You are about to drop the column `errorMessage` on the `WebhookLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WebhookLog" DROP COLUMN "errorMessage";

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");
