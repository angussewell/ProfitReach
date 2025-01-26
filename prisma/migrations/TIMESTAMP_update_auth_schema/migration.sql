-- Drop all existing tables
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP TABLE IF EXISTS "metric" CASCADE;
DROP TABLE IF EXISTS "signature" CASCADE;
DROP TABLE IF EXISTS "scenario" CASCADE;
DROP TABLE IF EXISTS "prompt" CASCADE;
DROP TABLE IF EXISTS "fieldMapping" CASCADE;
DROP TABLE IF EXISTS "attachment" CASCADE;
DROP TABLE IF EXISTS "webhookField" CASCADE;
DROP TABLE IF EXISTS "webhookLog" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;

-- Create NextAuth tables
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create other tables
CREATE TABLE "metric" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "enrollments" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "signature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'simple',
    "status" TEXT NOT NULL DEFAULT 'active',
    "signatureId" TEXT,
    "customizationPrompt" TEXT,
    "emailExamplesPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fieldMapping" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fieldMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhookField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhookField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhookLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'error',
    "scenarioName" TEXT NOT NULL DEFAULT 'Unknown',
    "contactEmail" TEXT NOT NULL DEFAULT 'Unknown',
    "contactName" TEXT NOT NULL DEFAULT 'Unknown',
    "company" TEXT NOT NULL DEFAULT 'Unknown',
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "webhookLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "signature_name_key" ON "signature"("name");
CREATE UNIQUE INDEX "scenario_name_key" ON "scenario"("name");
CREATE UNIQUE INDEX "prompt_name_key" ON "prompt"("name");
CREATE UNIQUE INDEX "fieldMapping_name_key" ON "fieldMapping"("name");
CREATE UNIQUE INDEX "webhookField_name_key" ON "webhookField"("name");
CREATE UNIQUE INDEX "metric_accountId_scenarioName_key" ON "metric"("accountId", "scenarioName");

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "scenario_name_idx" ON "scenario"("name");
CREATE INDEX "metric_scenarioName_idx" ON "metric"("scenarioName");
CREATE INDEX "attachment_scenarioId_idx" ON "attachment"("scenarioId");
CREATE INDEX "webhookLog_scenarioName_idx" ON "webhookLog"("scenarioName");
CREATE INDEX "webhookLog_createdAt_idx" ON "webhookLog"("createdAt");
CREATE INDEX "webhookLog_accountId_idx" ON "webhookLog"("accountId");

-- Add foreign key constraints
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scenario" ADD CONSTRAINT "scenario_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE; 