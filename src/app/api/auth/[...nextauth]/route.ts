import NextAuth, { DefaultSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Extend the built-in session type
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    locationId?: string;
    user?: DefaultSession['user'] & {
      id: string;
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
  debug: true,
  session: {
    strategy: "jwt",
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
        url: TOKEN_URL,
        params: { 
          grant_type: "authorization_code",
        }
      },
      userinfo: {
        url: USERINFO_URL
      },
      clientId,
      clientSecret,
      profile(profile) {
        return {
          id: profile.location_id,
          email: profile.email || `location.${profile.location_id}@gohighlevel.com`,
          name: profile.name || `GoHighLevel Location ${profile.location_id}`,
          locationId: profile.location_id
        };
      }
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;
      
      try {
        // Store tokens in database
        await prisma.account.upsert({
          where: {
            ghl_location_id: profile.location_id
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          create: {
            ghl_location_id: profile.location_id,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });

        return true;
      } catch (error) {
        console.error('Error storing tokens:', error);
        return false;
      }
    },
    async jwt({ token, account, user, profile }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.locationId = profile?.location_id;
        token.userId = user.id;
        token.expires = Date.now() + 24 * 60 * 60 * 1000;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
        },
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        locationId: token.locationId as string,
        expires: new Date(token.expires as number).toISOString(),
      };
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to /scenarios after successful auth
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