import NextAuth, { DefaultSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

// Extend the built-in session type
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    locationId?: string;
    user: DefaultSession['user'] & {
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
  adapter: PrismaAdapter(prisma),
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
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
        console.log("Processing profile:", profile);
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
        // Store the account info
        const result = await prisma.account.upsert({
          where: {
            ghl_location_id: profile.location_id
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          },
          create: {
            ghl_location_id: profile.location_id,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          },
        });
        
        // Ensure we have a valid result before proceeding
        if (!result) {
          console.error('Failed to create/update account record');
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        // Don't fail on unique constraint - this is actually a success case
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
          return true;
        }
        return false;
      }
    },
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          locationId: account.providerAccountId,
          userId: user.id,
          email: user.email,
          name: user.name,
          expires: Date.now() + 24 * 60 * 60 * 1000
        };
      }

      // Return previous token if not expired
      if (token?.expires && Date.now() < (token.expires as number)) {
        return token;
      }

      // Token expired, try to refresh
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

      // If trying to access protected route while unauthenticated
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default to base URL
      return baseUrl;
    }
  },
  pages: {
    signIn: '/',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 