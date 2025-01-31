import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Get the user's current organization
        const currentOrg = user.organizationId ? await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { id: true, name: true }
        }) : null;

        // Get all organizations for the user
        const organizations = user.role === 'admin'
          ? await prisma.organization.findMany({
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true
              }
            })
          : await prisma.organization.findMany({
              where: {
                users: { some: { id: user.id } }
              },
              select: {
                id: true,
                name: true
              }
            });

        console.log('Found organizations for user:', {
          role: user.role,
          count: organizations.length,
          organizations: organizations.map(o => o.name)
        });

        return {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          role: user.role,
          organizationId: currentOrg?.id,
          organizationName: currentOrg?.name,
          organizations: organizations.length > 0 ? organizations : currentOrg ? [currentOrg] : []
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
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        console.log('Updating JWT with user data:', {
          userId: user.id,
          role: user.role,
          organizationCount: user.organizations?.length || 0
        });
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizations = user.organizations;
      }

      // Handle organization updates
      if (trigger === 'update' && session?.organizationId) {
        // Get the updated organization info
        const org = await prisma.organization.findUnique({
          where: { id: session.organizationId },
          select: { id: true, name: true }
        });
        
        if (org) {
          token.organizationId = org.id;
          token.organizationName = org.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Get fresh organization data
      const org = token.organizationId ? await prisma.organization.findUnique({
        where: { id: token.organizationId },
        select: { id: true, name: true }
      }) : null;

      // Get fresh organizations list
      const organizations = token.role === 'admin'
        ? await prisma.organization.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
          })
        : token.id ? await prisma.organization.findMany({
            where: {
              users: { some: { id: token.id } }
            },
            select: { id: true, name: true }
          })
        : [];

      session.user = {
        ...session.user,
        id: token.id,
        role: token.role,
        organizationId: org?.id || token.organizationId,
        organizationName: org?.name || token.organizationName,
        organizations: organizations
      };

      console.log('Session updated with organizations:', {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        organizationName: session.user.organizationName,
        organizationCount: organizations.length
      });

      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 