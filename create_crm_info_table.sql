-- CreateTable
CREATE TABLE "CrmInfo" (
  "organizationId" TEXT NOT NULL,
  "private_integration_token" TEXT,
  "prospect_research" TEXT,
  "company_research" TEXT,
  "previous_message_copy" TEXT,
  "previous_message_subject_line" TEXT,
  "previous_message_id" TEXT,
  "thread_id" TEXT,
  "email_sender" TEXT,
  "original_outbound_rep_name" TEXT,
  "date_of_research" TEXT,
  "all_employees" TEXT,
  "provider_id" TEXT,
  "mutual_connections" TEXT,
  "additional_research" TEXT,
  "current_scenario" TEXT,
  "outbound_rep_name" TEXT,
  "lead_status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmInfo_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
ALTER TABLE "CrmInfo" ADD CONSTRAINT "CrmInfo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
