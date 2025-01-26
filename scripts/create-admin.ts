const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Create or update admin organization
  const adminOrg = await prisma.organization.upsert({
    where: { name: 'Admin Organization' },
    update: {},
    create: { name: 'Admin Organization' }
  })

  // Create or update admin user
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@profitreach.com' },
    update: {
      name: process.env.ADMIN_NAME || 'Admin User',
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
      role: 'admin',
      organizationId: adminOrg.id
    },
    create: {
      name: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@profitreach.com',
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
      role: 'admin',
      organizationId: adminOrg.id
    }
  })

  console.log('Admin user created/updated successfully:', adminUser)

  // Create or update test organization
  const testOrg = await prisma.organization.upsert({
    where: { name: 'Alpine Gen' },
    update: {},
    create: { name: 'Alpine Gen' }
  })

  // Create or update test user
  const testUser = await prisma.user.upsert({
    where: { email: 'angus@alpinegen.com' },
    update: {
      name: 'Angus Sewell',
      password: await bcrypt.hash('S@ccoFresco16', 10),
      role: 'user',
      organizationId: testOrg.id
    },
    create: {
      name: 'Angus Sewell',
      email: 'angus@alpinegen.com',
      password: await bcrypt.hash('S@ccoFresco16', 10),
      role: 'user',
      organizationId: testOrg.id
    }
  })

  console.log('Test user created/updated successfully:', testUser)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 