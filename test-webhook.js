const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSaveEmailAccount() {
  try {
    // Data from Unipile webhook and API response
    const accountId = 'JdDlH3WWSDOvDOT8BfYkPg';
    const email = 'asewellmccann@gmail.com';  // Actual email from Unipile API
    const organizationId = 'cm6mp4wyo0000hagi89p5tgm4';  // Scale Your Cause organization
    
    // Verify organization exists
    console.log('🔍 Verifying organization:', { organizationId });
    
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      console.error('❌ Organization not found:', { organizationId });
      return;
    }

    console.log('✅ Organization verified:', { 
      id: organization.id,
      name: organization.name 
    });

    // Check if email account exists
    console.log('🔍 Checking for existing email account:', { unipileAccountId: accountId });
    
    let emailAccount = await prisma.emailAccount.findUnique({
      where: { unipileAccountId: accountId }
    });

    if (emailAccount) {
      console.log('📧 Updating existing email account:', {
        id: emailAccount.id,
        email,
        organizationId
      });

      emailAccount = await prisma.emailAccount.update({
        where: { id: emailAccount.id },
        data: {
          email,
          updatedAt: new Date()
        }
      });
    } else {
      console.log('📧 Creating new email account:', {
        email,
        organizationId,
        unipileAccountId: accountId
      });

      emailAccount = await prisma.emailAccount.create({
        data: {
          email,
          name: email,
          organizationId,
          unipileAccountId: accountId,
          isActive: true
        }
      });
    }

    console.log('✅ Email account saved:', emailAccount);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSaveEmailAccount(); 