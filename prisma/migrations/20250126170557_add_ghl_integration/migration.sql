/*
  Warnings:

  - You are about to drop the column `ghlConnected` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `ghlLocationId` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "ghlConnected",
DROP COLUMN "ghlLocationId";

-- CreateTable
CREATE TABLE "GHLIntegration" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locationName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GHLIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GHLIntegration_locationId_idx" ON "GHLIntegration"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "GHLIntegration_organizationId_locationId_key" ON "GHLIntegration"("organizationId", "locationId");

-- AddForeignKey
ALTER TABLE "GHLIntegration" ADD CONSTRAINT "GHLIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
