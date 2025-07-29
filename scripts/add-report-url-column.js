#!/usr/bin/env node

const { Client } = require('pg');

async function addReportUrlColumn() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_0aSKAvX8tfiM@ep-floral-mud-a8lkysc3-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Adding reportUrl column to ReportHistory table...');
    await client.query('ALTER TABLE "ReportHistory" ADD COLUMN "reportUrl" TEXT;');
    
    console.log('Successfully added reportUrl column to ReportHistory table');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ReportHistory' AND column_name = 'reportUrl'
    `);
    
    if (result.rows.length > 0) {
      console.log('Column verification successful:', result.rows[0]);
    } else {
      console.error('Column was not found after creation');
    }
    
  } catch (error) {
    console.error('Error executing migration:', error);
    
    // Check if column already exists
    if (error.message && error.message.includes('already exists')) {
      console.log('Column reportUrl already exists in ReportHistory table');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

if (require.main === module) {
  addReportUrlColumn().catch(console.error);
}

module.exports = { addReportUrlColumn };