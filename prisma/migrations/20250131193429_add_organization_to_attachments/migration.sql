/*
  Warnings:

  - You are about to drop the column `scenarioId` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Attachment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_scenarioId_fkey";

-- DropIndex
DROP INDEX "Attachment_scenarioId_key";

-- DropIndex
DROP INDEX "Scenario_attachmentId_key";

-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "scenarioId",
DROP COLUMN "url",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_name_key" ON "Attachment"("name");

-- CreateIndex
CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
