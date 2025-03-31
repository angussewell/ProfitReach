-- AlterTable: Add time zone, from email, and recipients to Appointment table
ALTER TABLE "Appointment" 
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "fromEmail" TEXT,
ADD COLUMN "recipients" JSONB;

-- Update the schema.prisma (this is just for documentation)
-- model Appointment {
--   id                  String       @id @default(uuid())
--   organizationId      String
--   createdAt           DateTime     @default(now())
--   notes               String?
--   clientName          String
--   appointmentType     String
--   appointmentDateTime DateTime
--   status              String       @default("appointment_booked")
--   timeZone            String?      
--   fromEmail           String?      
--   recipients          Json?       
--   organization        Organization @relation(fields: [organizationId], references: [id])
--
--   @@index([organizationId])
--   @@index([createdAt])
-- }
