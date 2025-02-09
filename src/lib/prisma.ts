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

// Initialize Prisma Client with immediate validation
async function initializePrismaClient(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  // Validate connection immediately
  const isValid = await validateConnection(client)
  if (!isValid) {
    throw new Error('Failed to establish database connection')
  }

  // Add middleware for operation retries
  client.$use(async (params: any, next: any) => {
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

  return client
}

// Initialize with immediate validation
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // In production, create a new client instance
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
} else {
  // In development, reuse the existing client
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
  }
  prisma = globalForPrisma.prisma
}

// Validate connection on first use
validateConnection(prisma).catch(error => {
  console.error('Initial database connection validation failed:', error)
  process.exit(1)
})

// Ensure connections are closed in production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export { prisma }
export default prisma 