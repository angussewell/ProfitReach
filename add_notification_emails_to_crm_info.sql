-- Add notification_emails column to CrmInfo table
ALTER TABLE "CrmInfo" ADD COLUMN "notification_emails" JSONB DEFAULT '[]'::jsonb;
