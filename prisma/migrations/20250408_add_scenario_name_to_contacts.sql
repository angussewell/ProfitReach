-- Add scenarioName column to Contacts table
ALTER TABLE "Contacts" ADD COLUMN "scenarioName" TEXT;

-- Create an index on scenarioName for faster queries
CREATE INDEX "Contacts_scenarioName_idx" ON "Contacts"("scenarioName");

-- Comment explaining the purpose
COMMENT ON COLUMN "Contacts"."scenarioName" IS 'Stores the name of the assigned scenario from workflow actions';
