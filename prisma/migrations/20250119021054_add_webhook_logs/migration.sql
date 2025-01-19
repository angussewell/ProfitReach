-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "signatureContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scenarioType" TEXT NOT NULL DEFAULT 'simple',
    "subjectLine" TEXT NOT NULL DEFAULT '',
    "signatureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customizationPrompt" TEXT,
    "emailExamplesPrompt" TEXT,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "scenarioName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_name_key" ON "Scenario"("name");

-- CreateIndex
CREATE INDEX "Scenario_name_idx" ON "Scenario"("name");

-- CreateIndex
CREATE INDEX "WebhookLog_scenarioName_idx" ON "WebhookLog"("scenarioName");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
