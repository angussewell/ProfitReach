-- Update some webhook logs with test message content

-- First, let's update logs with email subjects and HTML bodies
UPDATE "WebhookLog"
SET 
  "emailSubject" = 'Follow-up Email',
  "emailHtmlBody" = '<html><body><h1>Follow-up</h1><p>This is a follow-up email to discuss next steps.</p></body></html>'
WHERE 
  "id" IN (
    SELECT "id" FROM "WebhookLog" 
    ORDER BY "createdAt" DESC 
    LIMIT 3
  );

-- Add a different message to another log
UPDATE "WebhookLog"
SET 
  "emailSubject" = 'Introduction Email',
  "emailHtmlBody" = '<html><body><h1>Introduction</h1><p>Hello! I would like to introduce our company and services to you.</p><p>Let me know if you are interested in learning more.</p></body></html>'
WHERE 
  "id" IN (
    SELECT "id" FROM "WebhookLog" 
    WHERE "id" NOT IN (
      SELECT "id" FROM "WebhookLog" 
      WHERE "emailSubject" IS NOT NULL 
      OR "emailHtmlBody" IS NOT NULL
    )
    ORDER BY "createdAt" DESC 
    LIMIT 1
  );

-- Add just a subject but no body to another log
UPDATE "WebhookLog"
SET 
  "emailSubject" = 'Quick Question',
  "emailHtmlBody" = NULL
WHERE 
  "id" IN (
    SELECT "id" FROM "WebhookLog" 
    WHERE "id" NOT IN (
      SELECT "id" FROM "WebhookLog" 
      WHERE "emailSubject" IS NOT NULL 
      OR "emailHtmlBody" IS NOT NULL
    )
    ORDER BY "createdAt" DESC 
    LIMIT 1
  );

-- Add just a body but no subject to another log
UPDATE "WebhookLog"
SET 
  "emailSubject" = NULL,
  "emailHtmlBody" = '<html><body><p>This message has no subject line but does have a body.</p></body></html>'
WHERE 
  "id" IN (
    SELECT "id" FROM "WebhookLog" 
    WHERE "id" NOT IN (
      SELECT "id" FROM "WebhookLog" 
      WHERE "emailSubject" IS NOT NULL 
      OR "emailHtmlBody" IS NOT NULL
    )
    ORDER BY "createdAt" DESC 
    LIMIT 1
  ); 