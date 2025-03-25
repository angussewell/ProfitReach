-- First, ensure we have the ConversationStatus enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversationstatus') THEN
        CREATE TYPE "ConversationStatus" AS ENUM (
            'MEETING_BOOKED',
            'NOT_INTERESTED',
            'FOLLOW_UP_NEEDED',
            'NO_ACTION_NEEDED',
            'WAITING_FOR_REPLY'
        );
    END IF;
END $$;

-- Create StatusChangeLog table if it doesn't exist
CREATE TABLE IF NOT EXISTS "StatusChangeLog" (
    "id" TEXT PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "oldStatus" "ConversationStatus" NOT NULL,
    "newStatus" "ConversationStatus" NOT NULL,
    "changedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "scheduledChange" BOOLEAN DEFAULT FALSE,
    "successful" BOOLEAN NOT NULL,
    "errorMessage" TEXT
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "status_change_log_message_id_idx" ON "StatusChangeLog"("messageId");
CREATE INDEX IF NOT EXISTS "status_change_log_organization_id_idx" ON "StatusChangeLog"("organizationId");
CREATE INDEX IF NOT EXISTS "status_change_log_changed_at_idx" ON "StatusChangeLog"("changedAt");

-- Add statusChangedAt to EmailMessage if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'EmailMessage' 
        AND column_name = 'statusChangedAt'
    ) THEN
        ALTER TABLE "EmailMessage" 
        ADD COLUMN "statusChangedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create function to check and update message status
CREATE OR REPLACE FUNCTION check_and_update_message_status() RETURNS void AS $$
DECLARE
    message_record RECORD;
BEGIN
    -- Find messages that have been in WAITING_FOR_REPLY status for more than 3 days
    FOR message_record IN 
        SELECT id, "messageId", "threadId", "organizationId", status
        FROM "EmailMessage"
        WHERE status = 'WAITING_FOR_REPLY'
        AND "statusChangedAt" < NOW() - INTERVAL '3 days'
    LOOP
        -- Update the message status
        UPDATE "EmailMessage"
        SET 
            status = 'FOLLOW_UP_NEEDED'::ConversationStatus,
            "statusChangedAt" = CURRENT_TIMESTAMP
        WHERE id = message_record.id;

        -- Log the status change
        INSERT INTO "StatusChangeLog" (
            id,
            "messageId",
            "threadId",
            "organizationId",
            "oldStatus",
            "newStatus",
            "scheduledChange",
            "successful"
        ) VALUES (
            gen_random_uuid()::text,
            message_record."messageId",
            message_record."threadId",
            message_record."organizationId",
            'WAITING_FOR_REPLY'::ConversationStatus,
            'FOLLOW_UP_NEEDED'::ConversationStatus,
            TRUE,
            TRUE
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the cron job to run every hour
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'cron'
    ) THEN
        PERFORM cron.schedule(
            'update-message-status',  -- job name
            '0 * * * *',             -- every hour (cron expression)
            'SELECT check_and_update_message_status()'
        );
    ELSE
        RAISE NOTICE 'pg_cron extension is not available. Please install it to enable scheduled status updates.';
    END IF;
END $$;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS message_status_update_trigger ON "EmailMessage";
DROP FUNCTION IF EXISTS update_message_status_after_delay();

-- To manually run the check:
-- SELECT check_and_update_message_status(); 