-- CreateTable
CREATE TABLE "WebhookField" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookField_field_key" ON "WebhookField"("field");

-- CreateIndex
CREATE INDEX "WebhookField_lastSeen_idx" ON "WebhookField"("lastSeen");
