import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runManualMigration() {
  console.log('Starting manual migration for multi-tenant contacts...');
  
  try {
    // Step 1: Check for duplicates within same organization
    console.log('1. Checking for duplicate emails within same organization...');
    
    const duplicates = await prisma.$queryRaw<Array<{email: string, organizationId: string, count: number}>>`
      SELECT email, "organizationId", COUNT(*) as count 
      FROM "Contacts" 
      WHERE email IS NOT NULL 
      GROUP BY email, "organizationId" 
      HAVING COUNT(*) > 1 
      LIMIT 10
    `;
    
    if (duplicates.length > 0) {
      console.error('❌ Found duplicate emails within the same organization:');
      duplicates.forEach(dup => {
        console.error(`  - Email: ${dup.email}, Organization: ${dup.organizationId}, Count: ${dup.count}`);
      });
      console.error('Please resolve these duplicates before running the migration.');
      process.exit(1);
    }
    
    console.log('✅ No duplicate emails found within same organization');
    
    // Step 2: Add the unique constraint
    console.log('2. Adding unique constraint on (email, organizationId)...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Contacts" 
      ADD CONSTRAINT "Contacts_email_organizationId_key" 
      UNIQUE (email, "organizationId")
    `;
    
    console.log('✅ Added unique constraint');
    
    // Step 3: Make organizationId NOT NULL
    console.log('3. Making organizationId column NOT NULL...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Contacts" 
      ALTER COLUMN "organizationId" SET NOT NULL
    `;
    
    console.log('✅ Made organizationId NOT NULL');
    
    // Step 4: Verify the changes
    console.log('4. Verifying changes...');
    
    // Use raw query since TypeScript now expects organizationId to be non-null
    const nullOrgResult = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(*) as count 
      FROM "Contacts" 
      WHERE "organizationId" IS NULL
    `;
    
    const nullOrgCount = Number(nullOrgResult[0]?.count || 0);
    
    if (nullOrgCount > 0) {
      console.warn(`⚠️  Warning: ${nullOrgCount} contacts still have null organizationId`);
    } else {
      console.log('✅ All contacts have organizationId assigned');
    }
    
    console.log('✅ Manual migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // If constraint already exists, that's okay
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('✅ Constraint already exists - migration already applied');
    } else {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runManualMigration()
  .then(() => {
    console.log('\n✅ Manual migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Manual migration failed:', error);
    process.exit(1);
  });