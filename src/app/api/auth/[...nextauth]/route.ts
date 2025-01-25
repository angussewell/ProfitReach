import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

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
          response_type: "code",
          redirect_uri: process.env.GOHIGHLEVEL_REDIRECT_URI
        }
      },
      token: {
        url: TOKEN_URL,
        async request({ params }) {
          const tokenParams = {
            ...params,
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: process.env.GOHIGHLEVEL_REDIRECT_URI
          };
          
          console.log("Token request params:", tokenParams);
          console.log("Token URL:", TOKEN_URL);
          
          const response = await fetch(TOKEN_URL, {
            method: "POST",
            headers: HEADERS,
            body: new URLSearchParams(tokenParams as Record<string, string>)
          });
          
          if (!response.ok) {
            const error = await response.text();
            console.error("Token error response:", {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              error
            });
            throw new Error(`Token request failed: ${error}`);
          }
          
          const tokens = await response.json();
          console.log("Token success response:", tokens);
          return { tokens };
        }
      },
      userinfo: {
        url: USERINFO_URL,
        async request({ tokens }) {
          const response = await fetch(USERINFO_URL, {
            headers: {
              ...HEADERS,
              "Authorization": `Bearer ${tokens.access_token}`
            }
          });
          return response.json();
        }
      },
      clientId: clientId,
      clientSecret: clientSecret,
      profile(profile) {
        console.log("Processing profile:", profile);
        return {
          id: profile.location_id,
          email: profile.email || `location.${profile.location_id}@gohighlevel.com`,
          name: profile.name || `GoHighLevel Location ${profile.location_id}`,
        };
      }
    }
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.locationId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        locationId: token.locationId,
      };
    }
  },
  pages: {
    signIn: '/',
    error: '/error',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 