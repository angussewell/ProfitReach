export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Validate environment variables only in runtime
const validateEnv = () => {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET must be set');
  }
  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL must be set');
  }
};

// Only log in runtime
const logEnvironment = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('NextAuth Environment:', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    cookieDomain: isDevelopment ? 'none' : 'app.messagelm.com',
    isDevelopment
  });
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      role: string;
      ghlAccessToken?: string;
      ghlRefreshToken?: string;
      organizationId?: string;
      organizationName?: string;
      organizations?: { id: string; name: string }[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name?: string;
    email?: string;
    role: string;
    ghlAccessToken?: string;
    ghlRefreshToken?: string;
    accessTokenExpires?: number;
    organizationId?: string;
    organizationName?: string;
    organizations?: { id: string; name: string }[];
  }
}

const isDevelopment = process.env.NODE_ENV === 'development';

// Skip database operations during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Increased logging for debugging manager login
        console.log(`[AUTH] Authorize attempt for email: ${credentials?.email}`);
        
        if (!credentials?.email || !credentials?.password) {
          console.error('[AUTH] Error: Missing email or password');
          return null;
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          console.log(`[AUTH] User lookup result for ${credentials.email}:`, user ? `Found user ID ${user.id}, Role: ${user.role}` : 'User not found');
        } catch (dbError) {
           console.error(`[AUTH] Database error fetching user ${credentials.email}:`, dbError);
           return null; // Fail on DB error
        }

        if (!user) {
          console.warn(`[AUTH] Login failed: User not found for email ${credentials.email}`);
          return null;
        }

        if (!user.password) {
            console.warn(`[AUTH] Login failed: User ${credentials.email} found but has no password set.`);
            return null; // Or handle case where password might not be required (e.g., OAuth linking)
        }
        
        let isPasswordValid = false;
        try {
          isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log(`[AUTH] Password comparison result for ${credentials.email}: ${isPasswordValid ? 'Valid' : 'Invalid'}`);
        } catch (bcryptError) {
          console.error(`[AUTH] Bcrypt error comparing password for ${credentials.email}:`, bcryptError);
          return null; // Fail on bcrypt error
        }

        if (!isPasswordValid) {
          console.warn(`[AUTH] Login failed: Invalid password for email ${credentials.email}`);
          return null;
        }

        // Password is valid, proceed to fetch organization details
        console.log(`[AUTH] Login success for ${credentials.email}. Fetching organization details...`);
        
        let currentOrg: { id: string; name: string } | null = null;
        try {
            if (user.organizationId) {
                currentOrg = await prisma.organization.findUnique({
                    where: { id: user.organizationId },
                    select: { id: true, name: true }
                });
                console.log(`[AUTH] Found current organization for ${credentials.email}:`, currentOrg);
            }
        } catch (orgError) {
            console.error(`[AUTH] Error fetching current organization ${user.organizationId} for user ${credentials.email}:`, orgError);
            // Decide if this is fatal. Maybe allow login without full org details?
            // For now, let's proceed but log the error.
        }

        let organizations: { id: string; name: string }[] = [];
        try {
            if (user.role === 'admin') {
                organizations = await prisma.organization.findMany({
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true }
                });
            } else { // Includes 'user' and 'manager' roles
                organizations = await prisma.organization.findMany({
                    where: { users: { some: { id: user.id } } },
                    select: { id: true, name: true }
                });
            }
            console.log(`[AUTH] Found ${organizations.length} accessible organizations for ${credentials.email} (Role: ${user.role})`);
        } catch (orgListError) {
            console.error(`[AUTH] Error fetching organization list for user ${credentials.email}:`, orgListError);
            // Decide if this is fatal. Allow login?
        }

        // Ensure organizations list contains at least the currentOrg if applicable
        const finalOrganizations = [...organizations];
        if (currentOrg && !finalOrganizations.some(org => org.id === currentOrg?.id)) {
            console.warn(`[AUTH] Current organization ${currentOrg.id} not found in fetched list for ${credentials.email}. Adding it.`);
            finalOrganizations.push(currentOrg);
        }

        console.log(`[AUTH] Returning user object for ${credentials.email}`);
        return {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          role: user.role,
          organizationId: currentOrg?.id,
          organizationName: currentOrg?.name,
          organizations: finalOrganizations
        };
      }
    }),
    {
      id: 'gohighlevel',
      name: 'GoHighLevel',
      type: 'oauth',
      version: '2.0',
      clientId: process.env.NEXT_PUBLIC_GHL_CLIENT_ID,
      clientSecret: process.env.GHL_CLIENT_SECRET,
      authorization: {
        url: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
        params: {
          scope: 'businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly locations.write conversations.readonly conversations.write locations/tasks.readonly locations/tasks.write oauth.readonly oauth.write',
          response_type: 'code',
          user_type: 'Location',
          loginWindowOpenMode: 'self'
        }
      },
      token: {
        url: 'https://services.leadconnectorhq.com/oauth/token',
        params: { 
          grant_type: 'authorization_code',
          user_type: 'Location'
        }
      },
      userinfo: {
        url: 'https://services.leadconnectorhq.com/oauth/userinfo'
      },
      profile(profile) {
        return {
          id: profile.locationId || profile.id,
          name: profile.name,
          email: profile.email,
          role: 'user'
        };
      }
    }
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Skip database operations during build
      if (isBuildTime) {
        return token;
      }

      if (user) {
        // Initial sign in
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        
        // Fetch organizations only once during sign in
        if (!isBuildTime) {
          const organizations = user.role === 'admin'
            ? await prisma.organization.findMany({
                orderBy: { name: 'asc' },
                select: { id: true, name: true }
              })
            : await prisma.organization.findMany({
                where: {
                  users: { some: { id: user.id } }
                },
                select: { id: true, name: true }
              });
          
          token.organizations = organizations;
          
          if (user.organizationId) {
            const org = organizations.find(o => o.id === user.organizationId);
            if (org) {
              token.organizationName = org.name;
            }
          }
        }
      } else if (trigger === 'update' && session?.organizationId) {
        // Handle organization switch
        token.organizationId = session.organizationId;
        const org = token.organizations?.find(o => o.id === session.organizationId);
        if (org) {
          token.organizationName = org.name;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) {
        return session;
      }

      // Use cached data from token instead of querying database
      session.user = {
        ...session.user,
        id: token.id,
        role: token.role,
        organizationId: token.organizationId,
        organizationName: token.organizationName,
        organizations: token.organizations || []
      };

      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${isDevelopment ? '' : '__Secure-'}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: !isDevelopment,
        domain: isDevelopment ? undefined : 'app.messagelm.com'
      }
    }
  }
};

// Only validate and log during runtime, not during build
if (!isBuildTime && process.env.NODE_ENV !== 'test') {
  validateEnv();
  logEnvironment();
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 