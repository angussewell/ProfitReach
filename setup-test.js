const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestData() {
  try {
    // Check if organization exists
    console.log('🔍 Checking for existing organization...');
    let organization = await prisma.organization.findUnique({
      where: {
        name: 'MessageLM'
      }
    });

    if (!organization) {
      // Create organization if it doesn't exist
      console.log('🏢 Creating organization...');
      organization = await prisma.organization.create({
        data: {
          name: 'MessageLM',
          webhookUrl: 'test-webhook-url'
        }
      });
      console.log('✅ Organization created:', organization);
    } else {
      console.log('✅ Using existing organization:', organization);
    }

    // Check if user exists
    console.log('🔍 Checking for existing user...');
    let user = await prisma.user.findUnique({
      where: {
        email: 'angus@messagelm.com'
      }
    });

    if (!user) {
      // Create user if doesn't exist
      console.log('👤 Creating user...');
      user = await prisma.user.create({
        data: {
          email: 'angus@messagelm.com',
          name: 'Angus',
          organizationId: organization.id
        }
      });
      console.log('✅ User created:', user);
    } else {
      // Update user's organization if needed
      if (user.organizationId !== organization.id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id }
        });
        console.log('✅ Updated user organization:', user);
      } else {
        console.log('✅ Using existing user:', user);
      }
    }

    console.log('🎉 Setup complete! Organization ID:', organization.id);
    return { organization, user };
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData(); 