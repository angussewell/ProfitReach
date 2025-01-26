import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;

// Verify database connection on initialization
prisma.$connect()
  .then(() => console.log('Database connected successfully'))
  .catch((e: Error) => console.error('Database connection failed:', e)); 