/*
  Warnings:

  - A unique constraint covering the columns `[webhookUrl]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "webhookUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_webhookUrl_key" ON "Organization"("webhookUrl");
