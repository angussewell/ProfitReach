import { AuthOptions } from 'next-auth';
import { HUBSPOT_CONFIG } from '@/config/hubspot';

// Add detailed environment variable validation at the top
if (!HUBSPOT_CONFIG.clientId) {
  console.error('[NextAuth] Missing HUBSPOT_CLIENT_ID');
}
if (!HUBSPOT_CONFIG.clientSecret) {
  console.error('[NextAuth] Missing HUBSPOT_CLIENT_SECRET');
}
if (!process.env.NEXTAUTH_URL) {
  console.error('[NextAuth] Missing NEXTAUTH_URL');
}
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[NextAuth] Missing NEXTAUTH_SECRET');
}

// Log all environment variables (excluding secrets)
console.log('[NextAuth] Configuration:', {
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nodeEnv: process.env.NODE_ENV,
  hubspotAppId: HUBSPOT_CONFIG.appId,
  hubspotClientId: HUBSPOT_CONFIG.clientId,
  hubspotRedirectUri: HUBSPOT_CONFIG.redirectUri,
  hubspotScopes: HUBSPOT_CONFIG.scopes,
});

export const authOptions: AuthOptions = {
  providers: [
    {
      id: 'hubspot',
      name: 'HubSpot',
      type: 'oauth',
      authorization: {
        url: 'https://app.hubspot.com/oauth/authorize',
        params: {
          client_id: HUBSPOT_CONFIG.clientId,
          scope: HUBSPOT_CONFIG.scopes.join(' '),
          redirect_uri: HUBSPOT_CONFIG.redirectUri,
          response_type: 'code',
        },
      },
      token: 'https://api.hubapi.com/oauth/v1/token',
      userinfo: 'https://api.hubapi.com/oauth/v1/refresh-tokens',
      profile(profile) {
        return {
          id: profile.user,
          name: profile.hub_domain,
          email: profile.user,
        };
      },
      clientId: HUBSPOT_CONFIG.clientId,
      clientSecret: HUBSPOT_CONFIG.clientSecret,
    },
  ],
  debug: true,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.hubspotPortalId = account.hubspotPortalId;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        hubspotPortalId: token.hubspotPortalId
      };
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}; 