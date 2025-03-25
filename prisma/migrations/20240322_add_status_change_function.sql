-- Create a function to update message status after 3 days
CREATE OR REPLACE FUNCTION update_message_status_after_delay() RETURNS trigger AS $$
BEGIN
    -- Schedule status update after 3 days for messages with WAITING_FOR_REPLY status
    IF NEW.status = 'WAITING_FOR_REPLY' THEN
        -- Create a job to update the status after 3 days
        PERFORM pg_sleep_for('3 days'::interval);
        
        -- Only update if still in WAITING_FOR_REPLY status after 3 days
        UPDATE "EmailMessage"
        SET status = 'FOLLOW_UP_NEEDED'
        WHERE id = NEW.id 
        AND status = 'WAITING_FOR_REPLY'
        AND statusChangedAt < NOW() - INTERVAL '3 days';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status
CREATE OR REPLACE TRIGGER message_status_update_trigger
    AFTER INSERT OR UPDATE OF status
    ON "EmailMessage"
    FOR EACH ROW
    EXECUTE FUNCTION update_message_status_after_delay();

-- Add statusChangedAt column if it doesn't exist
ALTER TABLE "EmailMessage"
ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP; 