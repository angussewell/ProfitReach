-- DropIndex
DROP INDEX "Scenario_signatureId_idx";

-- AlterTable
ALTER TABLE "Scenario" ALTER COLUMN "scenarioType" SET DEFAULT 'simple',
ALTER COLUMN "subjectLine" SET DEFAULT '';
