import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Add connection validation function
async function validateConnection(prisma: PrismaClient) {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connection successful')
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Initialize Prisma Client with retries
async function initializePrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Try to connect
  let isConnected = false
  let attempts = 0
  const maxAttempts = 3

  while (!isConnected && attempts < maxAttempts) {
    isConnected = await validateConnection(client)
    if (!isConnected) {
      attempts++
      if (attempts === maxAttempts) {
        throw new Error('Failed to connect to database after multiple attempts')
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
    }
  }

  return client
}

// Initialize with connection validation
let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  
  // Validate connection immediately
  validateConnection(prisma)
    .then(isConnected => {
      if (!isConnected) {
        console.error('Initial database connection failed - server may not function correctly');
      }
    })
    .catch(console.error);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

// Add middleware for operation retries
prisma.$use(async (params: any, next: any) => {
  const startTime = Date.now()
  let attempts = 0
  const maxAttempts = 3
  const backoffMs = 1000

  while (attempts < maxAttempts) {
    try {
      const result = await next(params)
      const duration = Date.now() - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Database operation completed in ${duration}ms`)
      }
      
      return result
    } catch (error: any) {
      console.error(`Database operation failed (attempt ${attempts + 1}/${maxAttempts}):`, error)
      attempts++
      if (attempts === maxAttempts) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, backoffMs * attempts))
    }
  }
})

// Ensure connections are closed in production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export { prisma }
export default prisma 