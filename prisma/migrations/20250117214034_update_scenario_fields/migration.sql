-- DropForeignKey
ALTER TABLE "Scenario" DROP CONSTRAINT "Scenario_signatureId_fkey";

-- AlterTable
ALTER TABLE "Scenario" ALTER COLUMN "signatureId" DROP NOT NULL,
ALTER COLUMN "customizationPrompt" DROP NOT NULL,
ALTER COLUMN "emailExamplesPrompt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Scenario_name_idx" ON "Scenario"("name");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
