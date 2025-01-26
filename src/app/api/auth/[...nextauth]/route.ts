import NextAuth, { DefaultSession } from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

// Extend the built-in session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string | null;
    refreshToken?: string | null;
    locationId?: string | null;
  }
}

const clientId = process.env.GOHIGHLEVEL_CLIENT_ID || '';
const clientSecret = process.env.GOHIGHLEVEL_CLIENT_SECRET || '';

const TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";
const USERINFO_URL = "https://services.leadconnectorhq.com/oauth/userinfo";

// Create custom adapter
function CustomAdapter(p: typeof prisma) {
  const adapter = PrismaAdapter(p);
  return {
    ...adapter,
    async linkAccount(data: AdapterAccount): Promise<void> {
      await p.$executeRaw`
        INSERT INTO "Account" (
          "id",
          "userId",
          "type",
          "provider",
          "providerAccountId",
          "access_token",
          "refresh_token",
          "expires_at",
          "token_type",
          "scope"
        ) VALUES (
          gen_random_uuid(),
          ${data.userId},
          'oauth',
          'gohighlevel',
          ${data.providerAccountId},
          ${data.access_token},
          ${data.refresh_token},
          ${data.expires_at},
          ${data.token_type},
          ${data.scope}
        )
        ON CONFLICT ("provider", "providerAccountId") 
        DO UPDATE SET
          "access_token" = EXCLUDED.access_token,
          "refresh_token" = EXCLUDED.refresh_token,
          "expires_at" = EXCLUDED.expires_at,
          "token_type" = EXCLUDED.token_type,
          "scope" = EXCLUDED.scope;
      `;
    }
  } satisfies Adapter;
}

export const authOptions: NextAuthOptions = {
  adapter: CustomAdapter(prisma),
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
    async session({ session, user }) {
      type AccountResult = {
        access_token: string | null;
        refresh_token: string | null;
        providerAccountId: string;
      };

      const accounts = await prisma.$queryRaw<AccountResult[]>`
        SELECT access_token, refresh_token, "providerAccountId"
        FROM "Account"
        WHERE "userId" = ${user.id}
        AND provider = 'gohighlevel'
        ORDER BY id DESC
        LIMIT 1
      `;

      if (!accounts || !accounts.length) {
        return session;
      }

      const account = accounts[0];

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id
        },
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        locationId: account.providerAccountId ?? null,
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