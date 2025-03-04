-- Create the ConversationStatus enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversationstatus') THEN
        CREATE TYPE "ConversationStatus" AS ENUM ('MEETING_BOOKED', 'NOT_INTERESTED', 'FOLLOW_UP_NEEDED', 'NO_ACTION_NEEDED');
    END IF;
END
$$;

-- Add the status column to the EmailMessage table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EmailMessage' AND column_name = 'status') THEN
        ALTER TABLE "EmailMessage" ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'FOLLOW_UP_NEEDED';
    END IF;
END
$$; 