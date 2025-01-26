import NextAuth, { DefaultSession, User as NextAuthUser } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';

interface User extends NextAuthUser {
  role: string;
  organizationId: string | null;
}

// Extend the built-in session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      organizationId: string | null;
    } & DefaultSession["user"]
    accessToken?: string | null;
    refreshToken?: string | null;
    locationId?: string | null;
  }
}

const clientId = process.env.GOHIGHLEVEL_CLIENT_ID || '';
const clientSecret = process.env.GOHIGHLEVEL_CLIENT_SECRET || '';

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const USERINFO_URL = "https://services.leadconnectorhq.com/oauth/userinfo";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true }
        });

        if (!user || !user.password) {
          throw new Error('No user found with this email')
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)

        if (!passwordMatch) {
          throw new Error('Incorrect password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        }
      }
    }),
    {
      id: "gohighlevel",
      name: "GoHighLevel",
      type: "oauth",
      authorization: {
        url: "https://marketplace.leadconnectorhq.com/oauth/chooselocation",
        params: { 
          client_id: clientId,
          scope: "businesses.readonly businesses.write companies.readonly custom-menu-link.write custom-menu-link.readonly emails/builder.readonly emails/builder.write users.readonly users.write workflows.readonly oauth.readonly oauth.write opportunities.readonly opportunities.write locations/customFields.write locations/customFields.readonly locations/customValues.write locations/customValues.readonly conversations/message.readonly conversations/message.write conversations/reports.readonly conversations/livechat.write conversations.write conversations.readonly campaigns.readonly",
          response_type: "code"
        }
      },
      token: {
        url: TOKEN_URL,
        params: { grant_type: "authorization_code" }
      },
      userinfo: {
        url: USERINFO_URL
      },
      clientId,
      clientSecret,
      profile(profile: any) {
        return {
          id: profile.location_id,
          email: profile.email || `location.${profile.location_id}@gohighlevel.com`,
          name: profile.name || `GoHighLevel Location ${profile.location_id}`,
          image: null
        };
      }
    }
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
        token.organizationId = (user as User).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string | null;
      }

      // If user has GHL connected, get the tokens
      if (session.user.organizationId) {
        const ghlIntegration = await prisma.gHLIntegration.findFirst({
          where: { organizationId: session.user.organizationId },
          orderBy: { createdAt: 'desc' }
        });

        if (ghlIntegration) {
          session.accessToken = ghlIntegration.accessToken;
          session.refreshToken = ghlIntegration.refreshToken;
          session.locationId = ghlIntegration.locationId;
        }
      }

      return session;
    },
    async signIn({ user, account }) {
      // Store GHL integration data when user connects their account
      if (account?.provider === 'gohighlevel' && user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { organization: true }
        });

        if (dbUser?.organizationId && account.access_token && account.refresh_token) {
          await prisma.gHLIntegration.create({
            data: {
              locationId: account.providerAccountId,
              locationName: user.name,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: new Date(Date.now() + (account.expires_at || 0) * 1000),
              organizationId: dbUser.organizationId
            }
          });
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('callback') || url.includes('error')) {
        return `${baseUrl}/scenarios`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
  pages: {
    signIn: '/auth/login',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 