-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "systemField" TEXT NOT NULL,
    "webhookField" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" REAL,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldMapping_webhookField_idx" ON "FieldMapping"("webhookField");

-- CreateIndex
CREATE UNIQUE INDEX "FieldMapping_systemField_key" ON "FieldMapping"("systemField");
