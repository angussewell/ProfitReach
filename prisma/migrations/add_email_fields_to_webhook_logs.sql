-- AlterTable
ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "emailSubject" TEXT;
ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "emailHtmlBody" TEXT; 