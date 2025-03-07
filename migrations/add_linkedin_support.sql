-- Create MessageSource enum type
DO $$ BEGIN
    CREATE TYPE "MessageSource" AS ENUM ('EMAIL', 'LINKEDIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add messageSource to EmailMessage with default 'EMAIL'
DO $$ BEGIN
    ALTER TABLE "EmailMessage" ADD COLUMN "messageSource" "MessageSource" NOT NULL DEFAULT 'EMAIL';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add socialAccountId with a foreign key constraint
DO $$ BEGIN
    ALTER TABLE "EmailMessage" ADD COLUMN "socialAccountId" TEXT REFERENCES "SocialAccount"("id");
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create an index for the new column if it doesn't exist
DO $$ BEGIN
    CREATE INDEX "EmailMessage_socialAccountId_idx" ON "EmailMessage"("socialAccountId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 