-- Insert a test message with WAITING_FOR_REPLY status
INSERT INTO "public"."EmailMessage" (
  "id",
  "messageId",
  "threadId",
  "organizationId",
  "subject",
  "sender",
  "recipientEmail",
  "content",
  "receivedAt",
  "messageType",
  "isRead",
  "status",
  "messageSource"
) VALUES (
  'test_message_1',
  'test_' || extract(epoch from now()),
  'test_thread_1',
  (SELECT id FROM "public"."Organization" LIMIT 1), -- Gets first organization ID
  'Test Message',
  'test@example.com',
  'recipient@example.com',
  'This is a test message',
  now(),
  'REAL_REPLY',
  true,
  'WAITING_FOR_REPLY',
  'EMAIL'
); 