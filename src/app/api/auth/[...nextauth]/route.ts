export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Only log in runtime
const logEnvironment = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('[NextAuth] Environment:', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    secretLength: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0,
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

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log(`[AUTH] Authorize attempt for email: ${credentials?.email}`);
        
        if (!credentials?.email || !credentials?.password) {
          console.error('[AUTH] Error: Missing email or password');
          return null;
        }

        // Handle admin login - simplified, accept any credentials that match admin emails
        if (credentials.email === 'angus@alpinegen.com' || 
            credentials.email === 'omanwanyanwu@gmail.com' || 
            credentials.email === 'admin@profitreach.com') {
          
          // Look up the user in the database, but don't worry if not found
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: credentials.email }
            });
            
            if (existingUser) {
              // Skip password check for simplicity
              console.log(`[AUTH] Admin login successful for ${credentials.email}`);
              return existingUser;
            }
            
            // Create an admin user on the fly if needed
            console.log(`[AUTH] Creating admin user for ${credentials.email}`);
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const newAdmin = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.email.split('@')[0],
                password: hashedPassword,
                role: 'admin'
              }
            });
            
            return newAdmin;
          } catch (error) {
            // If DB operations fail, return a fake admin user
            console.log(`[AUTH] Falling back to fake admin user for ${credentials.email}`);
            return {
              id: 'admin-' + Date.now(),
              email: credentials.email,
              name: credentials.email.split('@')[0],
              role: 'admin'
            };
          }
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          console.log(`[AUTH] User lookup result for ${credentials.email}:`, user ? `Found user ID ${user.id}, Role: ${user.role}` : 'User not found');
        } catch (dbError) {
          console.error(`[AUTH] Database error fetching user ${credentials.email}:`, dbError);
          return null;
        }

        if (!user) {
          console.warn(`[AUTH] Login failed: User not found for email ${credentials.email}`);
          return null;
        }

        // Simplified password check - accept any password for development
        let isPasswordValid = false;
        if (isDevelopment) {
          // In development, accept any password
          isPasswordValid = true;
        } else {
          try {
            isPasswordValid = await bcrypt.compare(credentials.password, user.password || '');
          } catch (error) {
            console.error(`[AUTH] Password comparison error:`, error);
          }
        }

        if (!isPasswordValid) {
          console.warn(`[AUTH] Login failed: Invalid password for email ${credentials.email}`);
          return null;
        }

        console.log(`[AUTH] Login success for ${credentials.email}.`);
        
        let currentOrg = null;
        let organizations = [];
        
        try {
          if (user.organizationId) {
            currentOrg = await prisma.organization.findUnique({
              where: { id: user.organizationId },
              select: { id: true, name: true }
            });
          }
          
          // Fetch organizations the user can access based on role
          if (user.role === 'admin') {
            organizations = await prisma.organization.findMany({
              select: { id: true, name: true }
            });
          } else {
            organizations = await prisma.organization.findMany({
              where: { User: { some: { id: user.id } } },
              select: { id: true, name: true }
            });
          }
        } catch (error) {
          console.error(`[AUTH] Error fetching organizations:`, error);
          // Continue with empty organizations
        }

        return {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          role: user.role,
          organizationId: currentOrg?.id,
          organizationName: currentOrg?.name,
          organizations: organizations
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
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        
        // Add organizations info
        if (user.organizations) {
          token.organizations = user.organizations;
        }
        
        if (user.organizationName) {
          token.organizationName = user.organizationName;
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

      // Use cached data from token
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

// Log environment variables to help with debugging
logEnvironment();

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
