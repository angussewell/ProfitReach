import NextAuth, { DefaultSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

// Extend the built-in session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
    refreshToken?: string;
    locationId?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

const clientId = process.env.GOHIGHLEVEL_CLIENT_ID || '';
const clientSecret = process.env.GOHIGHLEVEL_CLIENT_SECRET || '';

const HEADERS = {
  "Version": "2021-07-28",
  "Accept": "application/json",
  "Content-Type": "application/x-www-form-urlencoded",
  "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
  "User-Agent": "NextJS-App"
} as const;

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const USERINFO_URL = "https://services.leadconnectorhq.com/oauth/userinfo";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true,
  session: {
    strategy: "database",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
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
        url: "https://services.leadconnectorhq.com/oauth/token",
        params: { grant_type: "authorization_code" }
      },
      userinfo: {
        url: "https://services.leadconnectorhq.com/oauth/userinfo"
      },
      clientId,
      clientSecret,
      profile(profile) {
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
    async signIn({ user, account }) {
      if (!account) return false;

      try {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "gohighlevel",
            providerAccountId: user.id,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: Math.floor(Date.now() / 1000 + 24 * 60 * 60),
            token_type: account.token_type || "Bearer",
            scope: account.scope,
          },
        });
        return true;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
          // Account already exists, update it
          await prisma.account.update({
            where: {
              provider_providerAccountId: {
                provider: "gohighlevel",
                providerAccountId: user.id
              }
            },
            data: {
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: Math.floor(Date.now() / 1000 + 24 * 60 * 60),
              token_type: account.token_type || "Bearer",
              scope: account.scope,
            }
          });
          return true;
        }
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
    async session({ session, user }) {
      const account = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: "gohighlevel"
        },
        orderBy: { id: 'desc' }
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
        accessToken: account?.access_token ?? null,
        refreshToken: account?.refresh_token ?? null,
        locationId: account?.providerAccountId ?? null,
      };
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('callback') || url.includes('error')) {
        return `${baseUrl}/scenarios`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
  pages: {
    signIn: '/',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 