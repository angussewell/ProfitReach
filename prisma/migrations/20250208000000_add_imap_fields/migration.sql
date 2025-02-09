-- AlterTable
ALTER TABLE "EmailAccount" 
ADD COLUMN "incomingServer" TEXT,
ADD COLUMN "incomingServerPort" INTEGER,
ADD COLUMN "incomingUser" TEXT,
ADD COLUMN "incomingPassword" TEXT,
ADD COLUMN "sslEnabled" BOOLEAN DEFAULT true,
ADD COLUMN "startTls" BOOLEAN DEFAULT false,
ADD COLUMN "saveSentCopy" BOOLEAN DEFAULT true,
ADD COLUMN "syncFromDate" TIMESTAMP; 