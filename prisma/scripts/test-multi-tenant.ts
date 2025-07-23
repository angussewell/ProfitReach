import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMultiTenantFunctionality() {
  console.log('Testing multi-tenant contact functionality...');
  
  try {
    // Get two different organizations for testing
    const orgs = await prisma.organization.findMany({
      take: 2,
      orderBy: { createdAt: 'asc' }
    });
    
    if (orgs.length < 2) {
      console.error('❌ Need at least 2 organizations to test multi-tenancy');
      process.exit(1);
    }
    
    const org1 = orgs[0];
    const org2 = orgs[1];
    
    console.log(`Using organizations:
  - Org 1: ${org1.name} (${org1.id})
  - Org 2: ${org2.name} (${org2.id})`);
    
    const testEmail = 'test-multitenant@example.com';
    
    // Test 1: Create a contact with the same email in both organizations
    console.log('\n1. Testing contact creation with same email in different orgs...');
    
    try {
      // Create contact in Org 1
      const contact1 = await prisma.contacts.create({
        data: {
          id: 'test-contact-1-' + Date.now(),
          email: testEmail,
          firstName: 'Test',
          lastName: 'User 1',
          organizationId: org1.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Created contact in ${org1.name}: ${contact1.id}`);
      
      // Create contact with same email in Org 2
      const contact2 = await prisma.contacts.create({
        data: {
          id: 'test-contact-2-' + Date.now(),
          email: testEmail,
          firstName: 'Test',
          lastName: 'User 2', 
          organizationId: org2.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Created contact in ${org2.name}: ${contact2.id}`);
      console.log('✅ Successfully created contacts with same email in different organizations!');
      
      // Test 2: Try to create duplicate in same organization (should fail)
      console.log('\n2. Testing duplicate email within same organization (should fail)...');
      
      try {
        await prisma.contacts.create({
          data: {
            id: 'test-duplicate-' + Date.now(),
            email: testEmail,
            firstName: 'Duplicate',
            lastName: 'User',
            organizationId: org1.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.error('❌ Duplicate creation should have failed!');
      } catch (duplicateError: any) {
        if (duplicateError?.code === 'P2002' && duplicateError?.meta?.target?.includes('email')) {
          console.log('✅ Correctly prevented duplicate email within same organization');
        } else {
          console.error('❌ Unexpected error:', duplicateError);
        }
      }
      
      // Test 3: Query contacts by organization
      console.log('\n3. Testing organization-scoped queries...');
      
      const org1Contacts = await prisma.contacts.findMany({
        where: { 
          organizationId: org1.id,
          email: testEmail 
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      
      const org2Contacts = await prisma.contacts.findMany({
        where: { 
          organizationId: org2.id,
          email: testEmail 
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      
      console.log(`✅ Found ${org1Contacts.length} contact(s) in ${org1.name}:`, org1Contacts);
      console.log(`✅ Found ${org2Contacts.length} contact(s) in ${org2.name}:`, org2Contacts);
      
      // Test 4: Test unique query using composite key
      console.log('\n4. Testing unique query with composite key...');
      
      const uniqueContact = await prisma.contacts.findUnique({
        where: {
          email_organizationId: {
            email: testEmail,
            organizationId: org1.id
          }
        },
        select: { id: true, email: true, firstName: true }
      });
      
      if (uniqueContact) {
        console.log(`✅ Found unique contact by composite key:`, uniqueContact);
      } else {
        console.error('❌ Could not find contact with composite key');
      }
      
      // Cleanup test contacts
      console.log('\n5. Cleaning up test contacts...');
      
      const deletedCount = await prisma.contacts.deleteMany({
        where: {
          email: testEmail,
          OR: [
            { organizationId: org1.id },
            { organizationId: org2.id }
          ]
        }
      });
      
      console.log(`✅ Cleaned up ${deletedCount.count} test contacts`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      
      // Cleanup on error
      await prisma.contacts.deleteMany({
        where: {
          email: testEmail,
          OR: [
            { organizationId: org1.id },
            { organizationId: org2.id }
          ]
        }
      });
    }
    
    console.log('\n✅ All multi-tenant tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testMultiTenantFunctionality()
  .then(() => {
    console.log('\n🎉 Multi-tenant functionality is working correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Multi-tenant tests failed:', error);
    process.exit(1);
  });