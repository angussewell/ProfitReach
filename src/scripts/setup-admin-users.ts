const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  log: ['warn', 'error']
});

async function setupAdminUsers() {
  try {
    console.log('Starting admin users setup...');

    // First, delete any existing admin users to clean up duplicates
    await prisma.user.deleteMany({
      where: {
        role: 'admin'
      }
    });
    console.log('Cleaned up existing admin users');

    // Create or update Alpine Gen organization
    const alpineGenOrg = await prisma.organization.upsert({
      where: { name: 'Alpine Gen' },
      update: {},
      create: { name: 'Alpine Gen' }
    });
    console.log('Alpine Gen organization created/updated');

    // Create or update MessageLM organization
    const messageLMOrg = await prisma.organization.upsert({
      where: { name: 'MessageLM' },
      update: {},
      create: { name: 'MessageLM' }
    });
    console.log('MessageLM organization created/updated');

    // Hash the password
    const hashedPassword = await bcrypt.hash('S@ccoFresco16', 10);

    // Create Angus's admin user
    const angusUser = await prisma.user.create({
      data: {
        email: 'angus@alpinegen.com',
        name: 'Angus Sewell',
        password: hashedPassword,
        role: 'admin',
        organizationId: alpineGenOrg.id
      }
    });
    console.log('Created Angus admin user');

    // Create Oma's admin user
    const omaUser = await prisma.user.create({
      data: {
        email: 'omanwanyanwu@gmail.com',
        name: 'Oma Nwanyanwu',
        password: hashedPassword,
        role: 'admin',
        organizationId: messageLMOrg.id
      }
    });
    console.log('Created Oma admin user');

    console.log('Setup completed successfully:', {
      organizations: [
        { name: alpineGenOrg.name, id: alpineGenOrg.id },
        { name: messageLMOrg.name, id: messageLMOrg.id }
      ],
      users: [
        { email: angusUser.email, orgId: angusUser.organizationId },
        { email: omaUser.email, orgId: omaUser.organizationId }
      ]
    });
  } catch (error) {
    console.error('Error in setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminUsers(); 