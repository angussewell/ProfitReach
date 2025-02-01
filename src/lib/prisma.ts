import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Add middleware for connection error handling and logging
prisma.$use(async (params, next) => {
  try {
    return await next(params)
  } catch (error: any) {
    // Log database errors
    console.error('Database operation failed:', {
      operation: params.action,
      model: params.model,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    throw error
  }
})

export default prisma 