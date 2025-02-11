-- Add Unipile fields first
ALTER TABLE "EmailAccount" ADD COLUMN "unipileAccountId" TEXT UNIQUE;

-- Drop old Mail360 and SMTP/IMAP fields
ALTER TABLE "EmailAccount" DROP COLUMN IF EXISTS "mail360AccountKey",
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