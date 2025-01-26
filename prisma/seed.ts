const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create default organization
  const organization = await prisma.organization.upsert({
    where: { name: 'Default Organization' },
    update: {},
    create: {
      name: 'Default Organization',
    },
  });

  // Hash the admin password
  const hashedPassword = await bcrypt.hash('admin123', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@profitreach.com' },
    update: {
      password: hashedPassword,
      role: 'admin',
      organizationId: organization.id,
    },
    create: {
      email: 'admin@profitreach.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'admin',
      organizationId: organization.id,
    },
  });

  console.log({ organization, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 