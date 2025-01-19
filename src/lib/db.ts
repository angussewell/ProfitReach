import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

// Verify database connection on initialization
prisma.$connect()
  .then(() => console.log('Database connected successfully'))
  .catch(e => console.error('Database connection failed:', e));

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
} 