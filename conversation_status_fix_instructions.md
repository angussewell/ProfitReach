# Conversation Status Update Fix Instructions

## Problem Description

The Universal Inbox is currently experiencing 500 errors when attempting to update conversation statuses. These errors occur because the database schema needs to be updated to include the new `status` field and `ConversationStatus` enum that were added to the Prisma schema.

## Solution Steps

Follow these steps to resolve the issue:

### 1. Apply Database Changes

Run the SQL script to add the necessary database changes. This script has been created in the project root as `add_conversation_status.sql`.

```bash
npx prisma db execute --file add_conversation_status.sql
```

This script will:
- Create the `ConversationStatus` enum type if it doesn't exist
- Add a `status` column to the `EmailMessage` table if it doesn't exist

### 2. Verify the Prisma Client is Up-to-Date

Ensure the Prisma client is regenerated to include the new types:

```bash
npx prisma generate
```

### 3. Restart the Application

Restart the application to ensure the changes are applied:

```bash
npm run dev
```

## Verification

To verify the fix is working:
1. Open the Universal Inbox
2. Select a conversation
3. Click on one of the status buttons (e.g., "Meeting Booked")
4. The status should update successfully without any 500 errors

## Troubleshooting

If you're still experiencing issues:

1. Check the server logs for specific error messages
2. Verify that the database connection is working correctly
3. Make sure the SQL script executed without errors
4. Confirm that the Prisma client was regenerated after the database changes

The API route has been updated to provide more detailed error messages that should help diagnose any ongoing issues.

## Database Schema Changes

For reference, here are the schema changes that are being applied:

```sql
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
``` 