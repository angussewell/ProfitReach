/*
  Warnings:

  - Added the required column `originalName` to the `WebhookField` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WebhookField" ADD COLUMN "originalName" TEXT;
UPDATE "WebhookField" SET "originalName" = name;
ALTER TABLE "WebhookField" ALTER COLUMN "originalName" SET NOT NULL;
