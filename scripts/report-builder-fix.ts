import { Client } from 'pg';

async function fixReportBuilderDatabase() {
  const connectionString = 'postgresql://neondb_owner:npg_0aSKAvX8tfiM@ep-floral-mud-a8lkysc3-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  const client = new Client(connectionString);

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check if ReportHistory table already exists
    const tableExists = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ReportHistory'
    `);

    if (tableExists.rows.length > 0) {
      console.log('⚠️ ReportHistory table already exists, skipping creation');
      return;
    }

    console.log('🏗️ Creating ReportHistory table...');

    // Create the ReportHistory table
    await client.query(`
      CREATE TABLE "ReportHistory" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reportBuilderConfigId" UUID NOT NULL REFERENCES "ReportBuilderConfig"(id) ON DELETE CASCADE,
        "contactId" VARCHAR(50) NOT NULL REFERENCES "Contacts"(id) ON DELETE CASCADE,
        "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
        "customNotes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ ReportHistory table created successfully');

    // Create index for performance
    await client.query(`
      CREATE INDEX "idx_reporthistory_config_id" ON "ReportHistory"("reportBuilderConfigId");
    `);

    console.log('✅ Index created on reportBuilderConfigId');

    // Create additional indexes for common queries
    await client.query(`
      CREATE INDEX "idx_reporthistory_user_id" ON "ReportHistory"("userId");
    `);

    await client.query(`
      CREATE INDEX "idx_reporthistory_created_at" ON "ReportHistory"("createdAt");
    `);

    console.log('✅ Additional indexes created');

    // Verify the table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'ReportHistory' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 ReportHistory table structure:');
    console.table(columns.rows);

    console.log('\n🎉 Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  fixReportBuilderDatabase()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default fixReportBuilderDatabase;