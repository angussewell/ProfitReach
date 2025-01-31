/*
  Warnings:

  - You are about to drop the column `type` on the `Scenario` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[scenarioId]` on the table `Attachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[attachmentId]` on the table `Scenario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_scenarioId_fkey";

-- DropIndex
DROP INDEX "Attachment_scenarioId_idx";

-- AlterTable
ALTER TABLE "Scenario" DROP COLUMN "type",
ADD COLUMN     "attachmentId" TEXT,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "snippetId" TEXT,
ADD COLUMN     "subjectLine" TEXT,
ADD COLUMN     "touchpointType" TEXT NOT NULL DEFAULT 'email';

-- CreateTable
CREATE TABLE "Snippet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Snippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Snippet_name_key" ON "Snippet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_scenarioId_key" ON "Attachment"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_attachmentId_key" ON "Scenario"("attachmentId");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "Snippet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("attachmentId") ON DELETE RESTRICT ON UPDATE CASCADE;
