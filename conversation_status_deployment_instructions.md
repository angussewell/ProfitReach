# Conversation Status Feature Deployment Instructions

This document provides step-by-step instructions for deploying the new Conversation Status feature for the Universal Inbox.

## Feature Overview

The Conversation Status feature allows sales representatives to:
- Mark conversations with different statuses (Meeting Booked, Not Interested, etc.)
- See color-coded status indicators in the conversation list
- Automatically track how many days since the last follow-up
- Clearly identify which conversations need attention

## Deployment Steps

### 1. Apply Database Changes

First, you need to apply the database changes to add the ConversationStatus enum type and the status field to the EmailMessage table.

Run the following SQL script against your database:

```sql
-- Create the ConversationStatus enum type
CREATE TYPE "ConversationStatus" AS ENUM ('MEETING_BOOKED', 'NOT_INTERESTED', 'FOLLOW_UP_NEEDED', 'NO_ACTION_NEEDED');

-- Add the status column to the EmailMessage table with default value
ALTER TABLE "EmailMessage" ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'FOLLOW_UP_NEEDED';
```

You can run this using your preferred PostgreSQL client, or if you have access to the production shell, you can run:

```bash
psql $DATABASE_URL -f add_conversation_status.sql
```

### 2. Regenerate Prisma Client

After applying the database changes, regenerate the Prisma client to update the TypeScript types:

```bash
npx prisma generate
```

### 3. Deploy Code Changes

The code changes include:
- Updated Prisma schema with the ConversationStatus enum
- New API endpoint for updating conversation status
- Updated Universal Inbox UI with status indicators and buttons
- Updated message reply API to maintain status

Deploy these changes to production using your usual deployment process.

### 4. Test the Feature

After deployment, test the feature by:
1. Opening the Universal Inbox
2. Selecting a conversation
3. Using the status buttons to mark it as "Meeting Booked", "Not Interested", etc.
4. Verify that the status is displayed correctly in the conversation list
5. Test that replying to a conversation maintains its status

## Expected Behavior

- Conversations marked as "Meeting Booked" will have a green indicator
- Conversations marked as "Not Interested" will have a gray indicator
- Conversations marked as "No Action Needed" will have a blue indicator  
- Conversations marked as "Follow Up Needed" will have a yellow/orange/red indicator based on days passed:
  - 0-1 days: Blue indicator
  - 2-3 days: Yellow indicator
  - 4+ days: Red indicator

## Rollback Plan

If issues occur, you can:
1. Roll back the code changes
2. Keep the database column (it won't cause any issues with the previous code)

If absolutely necessary, you can drop the column with:
```sql
ALTER TABLE "EmailMessage" DROP COLUMN "status";
DROP TYPE "ConversationStatus";
```

## Support

If you encounter any issues with this feature, please contact the development team for assistance. 