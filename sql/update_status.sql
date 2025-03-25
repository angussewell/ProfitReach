-- Function to update old waiting messages to follow up needed
CREATE OR REPLACE FUNCTION update_old_waiting_messages() RETURNS void AS $$
BEGIN
    UPDATE "EmailMessage"
    SET status = 'FOLLOW_UP_NEEDED'
    WHERE status = 'WAITING_FOR_REPLY'
    AND "receivedAt" < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;

-- You can run this manually with:
-- SELECT update_old_waiting_messages(); 