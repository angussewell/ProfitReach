/*
  Warnings:

  - You are about to drop the column `userId` on the `Scenario` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Prompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SequencePerformance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Scenario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customizationPrompt` to the `Scenario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emailExamplesPrompt` to the `Scenario` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Prompt" DROP CONSTRAINT "Prompt_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "Scenario" DROP CONSTRAINT "Scenario_userId_fkey";

-- DropForeignKey
ALTER TABLE "SequencePerformance" DROP CONSTRAINT "SequencePerformance_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "Scenario" DROP COLUMN "userId",
ADD COLUMN     "customizationPrompt" TEXT NOT NULL,
ADD COLUMN     "emailExamplesPrompt" TEXT NOT NULL;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Prompt";

-- DropTable
DROP TABLE "SequencePerformance";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "VerificationToken";

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_name_key" ON "Scenario"("name");

-- CreateIndex
CREATE INDEX "Scenario_signatureId_idx" ON "Scenario"("signatureId");
