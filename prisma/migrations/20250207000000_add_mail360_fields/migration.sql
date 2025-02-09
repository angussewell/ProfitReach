-- AlterTable
ALTER TABLE "EmailAccount" ADD COLUMN "mail360AccountKey" TEXT,
ADD COLUMN "smtpConnection" INTEGER,
ADD COLUMN "isGmail" BOOLEAN NOT NULL DEFAULT false; 