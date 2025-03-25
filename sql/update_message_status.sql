-- Function to update messages from WAITING_FOR_REPLY to FOLLOW_UP_NEEDED after 3 days
CREATE OR REPLACE FUNCTION update_old_waiting_messages() RETURNS void AS $$
BEGIN
    UPDATE "EmailMessage"
    SET status = 'FOLLOW_UP_NEEDED'
    WHERE status = 'WAITING_FOR_REPLY'
    AND "receivedAt" < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- You can run this function manually with:
-- SELECT update_old_waiting_messages();

-- Or set up a cron job in N8n to run this SQL every hour:
-- SELECT update_old_waiting_messages(); 