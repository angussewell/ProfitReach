import { PrismaClient, Prisma } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const MAX_TRANSACTION_TIMEOUT = 30000; // 30 seconds
const MAX_CONNECTION_TIMEOUT = 20000; // 20 seconds
const MAX_QUERY_TIMEOUT = 30000; // 30 seconds

// Health check function
const healthCheck = async (prisma: PrismaClient) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Health check failed:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })
    return false
  }
}

const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' }
      ]
    : [{ level: 'error', emit: 'event' }],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
}

// Initialize Prisma Client with enhanced error handling
function initializePrismaClient(): PrismaClient {
  const client = new PrismaClient(prismaClientOptions)

  // Log all database events in development
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e: Prisma.QueryEvent) => {
      console.log('Query: ' + e.query)
      console.log('Duration: ' + e.duration + 'ms')
    })
    
    client.$on('error', (e: Prisma.LogEvent) => {
      console.error('Prisma Error:', e)
    })
  }

  // Health check middleware with improved error handling
  client.$use(async (params, next) => {
    try {
      if (!await healthCheck(client)) {
        console.log('Attempting to recover from stale connection...')
        await client.$disconnect()
        await client.$connect()
      }
      return next(params)
    } catch (error) {
      console.error('Middleware error:', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
        params: {
          model: params.model,
          operation: params.action,
        },
        timestamp: new Date().toISOString()
      })
      throw error
    }
  })

  // Enhanced retry middleware with exponential backoff
  client.$use(async (params: any, next: any) => {
    const startTime = Date.now()
    let attempts = 0
    const maxAttempts = 5
    const baseBackoffMs = 1000

    while (attempts < maxAttempts) {
      try {
        const result = await next(params)
        const duration = Date.now() - startTime
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Database operation completed:', {
            duration,
            model: params.model,
            operation: params.action
          })
        }
        
        return result
      } catch (error: any) {
        attempts++
        
        // Detailed error logging
        console.error('Database operation failed:', {
          attempt: attempts,
          maxAttempts,
          error: {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
          },
          params: {
            model: params.model,
            operation: params.action,
          },
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        })

        if (attempts === maxAttempts) {
          throw error
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 1000
        const backoffMs = baseBackoffMs * Math.pow(2, attempts - 1) + jitter
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }
  })

  return client
}

// Initialize with proper singleton pattern
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = initializePrismaClient()
} else {
  // In development, reuse the existing client
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = initializePrismaClient()
  }
  prisma = globalForPrisma.prisma
}

// Validate initial connection
healthCheck(prisma).catch(error => {
  console.error('Initial database connection validation failed:', error)
  process.exit(1)
})

// Ensure connections are properly managed
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Handle unexpected errors
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('unhandledRejection', async (error) => {
  console.error('Unhandled rejection:', error)
  await prisma.$disconnect()
  process.exit(1)
})

export { prisma }
export default prisma 