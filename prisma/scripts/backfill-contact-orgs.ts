import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillContactOrganizations() {
  console.log('Starting contact organization backfill...');
  
  try {
    // Step 1: Find the first organization to use as default
    const defaultOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' }
    });
    
    if (!defaultOrg) {
      console.error('ERROR: No organizations found in the database!');
      console.log('Please create at least one organization before running this script.');
      process.exit(1);
    }
    
    console.log(`Using organization "${defaultOrg.name}" (ID: ${defaultOrg.id}) as default`);
    
    // Step 2: Count contacts without organizationId
    const orphanedContactsCount = await prisma.contacts.count({
      where: { organizationId: null }
    });
    
    if (orphanedContactsCount === 0) {
      console.log('✅ All contacts already have an organizationId assigned!');
      return;
    }
    
    console.log(`Found ${orphanedContactsCount} contacts without an organizationId`);
    
    // Step 3: Update all contacts without organizationId
    console.log('Updating contacts...');
    
    const updateResult = await prisma.contacts.updateMany({
      where: { organizationId: null },
      data: { organizationId: defaultOrg.id }
    });
    
    console.log(`✅ Successfully updated ${updateResult.count} contacts`);
    
    // Step 4: Verify the update
    const remainingOrphaned = await prisma.contacts.count({
      where: { organizationId: null }
    });
    
    if (remainingOrphaned > 0) {
      console.warn(`⚠️  Warning: ${remainingOrphaned} contacts still have no organizationId`);
    } else {
      console.log('✅ All contacts now have an organizationId!');
    }
    
    // Step 5: Show distribution of contacts per organization
    console.log('\nContact distribution by organization:');
    const orgDistribution = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { Contacts: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    orgDistribution.forEach(org => {
      console.log(`  - ${org.name}: ${org._count.Contacts} contacts`);
    });
    
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillContactOrganizations()
  .then(() => {
    console.log('\n✅ Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });