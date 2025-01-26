const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

interface User {
  email: string;
  name: string;
  role: string;
}

async function main() {
  console.log('Starting user setup...')
  console.log('Database URL:', process.env.DATABASE_URL)

  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connected successfully')

    // Create or update admin organization
    const adminOrg = await prisma.organization.upsert({
      where: { name: 'Admin Organization' },
      update: {},
      create: { name: 'Admin Organization' }
    })
    console.log('Admin organization created:', adminOrg)

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
    console.log('Admin user created:', adminUser)

    // Create or update test organization
    const testOrg = await prisma.organization.upsert({
      where: { name: 'Alpine Gen' },
      update: {},
      create: { name: 'Alpine Gen' }
    })
    console.log('Test organization created:', testOrg)

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
    console.log('Test user created:', testUser)

    // Verify users exist
    const users = await prisma.user.findMany()
    console.log('Total users in database:', users.length)
    console.log('User emails:', users.map((u: User) => u.email))
  } catch (error) {
    console.error('Error in setup:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 