import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    locationId?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
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