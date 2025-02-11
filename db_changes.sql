-- Create MessageType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('REAL_REPLY', 'BOUNCE', 'AUTO_REPLY', 'OUT_OF_OFFICE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add unipileAccountId to EmailAccount if it doesn't exist
DO $$ BEGIN
    ALTER TABLE "EmailAccount" ADD COLUMN "unipileAccountId" TEXT UNIQUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Drop old Mail360 and SMTP/IMAP fields if they exist
DO $$ BEGIN
    ALTER TABLE "EmailAccount" 
        DROP COLUMN IF EXISTS "mail360AccountKey",
        DROP COLUMN IF EXISTS "smtpConnection",
        DROP COLUMN IF EXISTS "password",
        DROP COLUMN IF EXISTS "outgoingServer",
        DROP COLUMN IF EXISTS "outgoingServerPort",
        DROP COLUMN IF EXISTS "isGmail",
        DROP COLUMN IF EXISTS "incomingServer",
        DROP COLUMN IF EXISTS "incomingServerPort",
        DROP COLUMN IF EXISTS "incomingUser",
        DROP COLUMN IF EXISTS "incomingPassword",
        DROP COLUMN IF EXISTS "sslEnabled",
        DROP COLUMN IF EXISTS "startTls",
        DROP COLUMN IF EXISTS "saveSentCopy",
        DROP COLUMN IF EXISTS "syncFromDate";
END $$;

-- Create EmailMessage table if it doesn't exist
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS "EmailMessage" (
        "id" TEXT NOT NULL,
        "messageId" TEXT NOT NULL,
        "threadId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "emailAccountId" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "sender" TEXT NOT NULL,
        "recipientEmail" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "receivedAt" TIMESTAMP(3) NOT NULL,
        "messageType" "MessageType" NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "classificationScores" JSONB,
        CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
    );
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Add indexes and constraints if they don't exist
DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_messageId_key" ON "EmailMessage"("messageId");
    CREATE INDEX IF NOT EXISTS "EmailMessage_organizationId_idx" ON "EmailMessage"("organizationId");
    CREATE INDEX IF NOT EXISTS "EmailMessage_emailAccountId_idx" ON "EmailMessage"("emailAccountId");
    CREATE INDEX IF NOT EXISTS "EmailMessage_threadId_idx" ON "EmailMessage"("threadId");
    
    ALTER TABLE "EmailMessage" 
        ADD CONSTRAINT "EmailMessage_organizationId_fkey" 
        FOREIGN KEY ("organizationId") 
        REFERENCES "Organization"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
        
    ALTER TABLE "EmailMessage" 
        ADD CONSTRAINT "EmailMessage_emailAccountId_fkey" 
        FOREIGN KEY ("emailAccountId") 
        REFERENCES "EmailAccount"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$; 