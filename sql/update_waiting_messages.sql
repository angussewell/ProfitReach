-- Function to update messages from WAITING_FOR_REPLY to FOLLOW_UP_NEEDED after 3 days
CREATE OR REPLACE FUNCTION update_old_waiting_messages() RETURNS void AS $$
BEGIN
    -- Update messages that have been in WAITING_FOR_REPLY status for more than 3 days
    UPDATE "EmailMessage"
    SET status = 'FOLLOW_UP_NEEDED'
    WHERE status = 'WAITING_FOR_REPLY'
    AND receivedAt < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run this function every hour
SELECT cron.schedule(
    'update-waiting-messages',  -- unique job name
    '0 * * * *',              -- run every hour (cron expression)
    $$SELECT update_old_waiting_messages()$$
); 