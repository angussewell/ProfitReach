/*
  Warnings:

  - You are about to drop the column `attachmentName` on the `Scenario` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `Scenario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Scenario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Scenario_name_idx";

-- DropIndex
DROP INDEX "Scenario_name_organizationId_key";

-- AlterTable
ALTER TABLE "Scenario" DROP COLUMN "attachmentName",
DROP COLUMN "messageId",
ALTER COLUMN "filters" DROP NOT NULL,
ALTER COLUMN "filters" SET DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_name_key" ON "Scenario"("name");

-- CreateIndex
CREATE INDEX "Scenario_organizationId_idx" ON "Scenario"("organizationId");
