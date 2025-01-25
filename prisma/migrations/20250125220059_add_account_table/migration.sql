/*
  Warnings:

  - You are about to drop the `Attachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FieldMapping` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Scenario` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Signature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ScenarioPrompts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "Scenario" DROP CONSTRAINT "Scenario_signatureId_fkey";

-- DropForeignKey
ALTER TABLE "_ScenarioPrompts" DROP CONSTRAINT "_ScenarioPrompts_A_fkey";

-- DropForeignKey
ALTER TABLE "_ScenarioPrompts" DROP CONSTRAINT "_ScenarioPrompts_B_fkey";

-- DropTable
DROP TABLE "Attachment";

-- DropTable
DROP TABLE "FieldMapping";

-- DropTable
DROP TABLE "Prompt";

-- DropTable
DROP TABLE "Scenario";

-- DropTable
DROP TABLE "Signature";

-- DropTable
DROP TABLE "WebhookField";

-- DropTable
DROP TABLE "WebhookLog";

-- DropTable
DROP TABLE "_ScenarioPrompts";

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "ghl_location_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "signature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fieldMapping" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "account_ghl_location_id_key" ON "account"("ghl_location_id");

-- CreateIndex
CREATE INDEX "metric_scenarioName_idx" ON "metric"("scenarioName");

-- CreateIndex
CREATE UNIQUE INDEX "metric_accountId_scenarioName_key" ON "metric"("accountId", "scenarioName");

-- CreateIndex
CREATE UNIQUE INDEX "signature_name_key" ON "signature"("name");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_name_key" ON "scenario"("name");

-- CreateIndex
CREATE INDEX "scenario_name_idx" ON "scenario"("name");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_name_key" ON "prompt"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fieldMapping_name_key" ON "fieldMapping"("name");

-- CreateIndex
CREATE INDEX "attachment_scenarioId_idx" ON "attachment"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "webhookField_name_key" ON "webhookField"("name");

-- CreateIndex
CREATE INDEX "webhookLog_scenarioName_idx" ON "webhookLog"("scenarioName");

-- CreateIndex
CREATE INDEX "webhookLog_createdAt_idx" ON "webhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "webhookLog_accountId_idx" ON "webhookLog"("accountId");

-- AddForeignKey
ALTER TABLE "metric" ADD CONSTRAINT "metric_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario" ADD CONSTRAINT "scenario_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhookLog" ADD CONSTRAINT "webhookLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
