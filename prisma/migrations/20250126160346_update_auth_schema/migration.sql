-- DropForeignKey
ALTER TABLE "attachment" DROP CONSTRAINT "attachment_scenarioId_fkey";

-- DropIndex
DROP INDEX "Account_userId_idx";

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
