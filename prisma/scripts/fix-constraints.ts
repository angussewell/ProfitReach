import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixConstraints() {
  console.log('Fixing constraints to enable true multi-tenancy...');
  
  try {
    // Drop the old global unique constraint on email
    console.log('1. Dropping global unique constraint on email...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Contacts" 
      DROP CONSTRAINT IF EXISTS "contacts_email_unique"
    `;
    
    console.log('✅ Dropped global email unique constraint');
    
    // Also drop the linkedinUrl unique constraint if it exists
    console.log('2. Dropping global unique constraint on linkedinUrl...');
    
    await prisma.$executeRaw`
      ALTER TABLE "Contacts" 
      DROP CONSTRAINT IF EXISTS "contacts_linkedinurl_unique"
    `;
    
    console.log('✅ Dropped global linkedinUrl unique constraint');
    
    // Verify the changes
    console.log('3. Verifying remaining constraints...');
    
    const remainingConstraints = await prisma.$queryRaw<Array<{constraint_name: string, constraint_type: string, constraint_definition: string}>>`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'Contacts')
      AND contype = 'u'
      ORDER BY conname;
    `;
    
    console.log('Remaining unique constraints:');
    remainingConstraints.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
    });
    
    // Check if we have the right constraint
    const hasCorrectConstraint = remainingConstraints.some(
      row => row.constraint_name === 'Contacts_email_organizationId_key'
    );
    
    if (hasCorrectConstraint) {
      console.log('✅ Multi-tenant constraint is properly configured!');
    } else {
      console.error('❌ Multi-tenant constraint is missing!');
    }
    
    console.log('\n✅ Constraint fixing completed!');
    
  } catch (error) {
    console.error('❌ Error fixing constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixConstraints()
  .then(() => {
    console.log('\n🎉 Constraints fixed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Constraint fixing failed:', error);
    process.exit(1);
  });