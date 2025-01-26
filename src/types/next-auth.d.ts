import 'next-auth';
import type { DefaultSession } from 'next-auth'
import { User as PrismaUser } from '@prisma/client';

declare module 'next-auth' {
  interface User extends Omit<PrismaUser, 'emailVerified' | 'createdAt' | 'updatedAt'> {
    organizationName?: string;
  }

  interface Session {
    user: User & {
      id: string;
      role: string;
      organizationId: string;
      organizationName?: string;
    } & DefaultSession['user']
    accessToken?: string | null
    refreshToken?: string | null
    locationId?: string | null
  }

  interface Profile {
    location_id: string;
    email?: string;
    name?: string;
  }

  interface Account {
    access_token: string;
    refresh_token: string;
    providerAccountId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    organizationId: string;
    organizationName?: string;
  }
} 