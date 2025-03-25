// This is a fix for UUID import issues with Next.js and NextAuth
// Re-export the UUIDv4 function to avoid ESM/CJS compatibility issues
import * as uuid from 'uuid';

export const uuidv4 = uuid.v4; 