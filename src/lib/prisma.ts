import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Add connection timeout
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection retry logic
  errorFormat: 'minimal',
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Add middleware for connection error handling and logging
prisma.$use(async (params, next) => {
  const startTime = Date.now()
  try {
    const result = await next(params)
    const duration = Date.now() - startTime
    
    // Log slow queries in production
    if (process.env.NODE_ENV === 'production' && duration > 1000) {
      console.warn('Slow database operation:', {
        operation: params.action,
        model: params.model,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      })
    }
    
    return result
  } catch (error: any) {
    // Enhanced error logging
    console.error('Database operation failed:', {
      operation: params.action,
      model: params.model,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`
    })
    
    // Specific handling for connection errors
    if (error.code === 'P1001' || error.code === 'P1002') {
      console.error('Database connection error - attempting to reconnect...')
      await prisma.$disconnect()
      await prisma.$connect()
    }
    
    throw error
  }
})

// Ensure connections are closed in production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma 