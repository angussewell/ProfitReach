-- Add WAITING_FOR_REPLY to the status enum if it doesn't exist
ALTER TYPE "public"."MessageStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REPLY';

-- Create function to update old waiting messages
CREATE OR REPLACE FUNCTION update_old_waiting_messages() RETURNS void AS $$
BEGIN
    UPDATE "public"."EmailMessage"
    SET status = 'FOLLOW_UP_NEEDED'
    WHERE status = 'WAITING_FOR_REPLY'
    AND "receivedAt" < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql; 