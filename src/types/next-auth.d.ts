import 'next-auth';
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      organizationId: string | null
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
    id: string
    role: string
    organizationId: string | null
  }
} 