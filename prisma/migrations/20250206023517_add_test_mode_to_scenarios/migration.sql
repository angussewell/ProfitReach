-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "testEmail" TEXT,
ADD COLUMN     "testMode" BOOLEAN NOT NULL DEFAULT false;
