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

// Validate that NEXTAUTH_URL matches our expected URL
const expectedUrl = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000' 
  : 'https://hubspot-dashboard.vercel.app';

if (process.env.NEXTAUTH_URL !== expectedUrl) {
  console.error(`[NextAuth] NEXTAUTH_URL mismatch. Expected ${expectedUrl}, got ${process.env.NEXTAUTH_URL}`);
}

// Log all environment variables (excluding secrets)
console.log('[NextAuth] Configuration:', {
  nextAuthUrl: process.env.NEXTAUTH_URL,
  expectedUrl,
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
        url: `https://app.hubspot.com/oauth/23255575/authorize`,
        params: {
          client_id: HUBSPOT_CONFIG.clientId,
          scope: HUBSPOT_CONFIG.scopes.join(' '),
          redirect_uri: HUBSPOT_CONFIG.redirectUri,
          response_type: 'code',
        },
      },
      token: {
        url: 'https://api.hubapi.com/oauth/v1/token',
        async request({ params }) {
          try {
            console.log('[NextAuth] Token request started:', {
              hasCode: !!params.code,
              redirectUri: HUBSPOT_CONFIG.redirectUri,
              clientId: HUBSPOT_CONFIG.clientId,
            });

            const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: HUBSPOT_CONFIG.clientId,
                client_secret: HUBSPOT_CONFIG.clientSecret,
                redirect_uri: HUBSPOT_CONFIG.redirectUri,
                code: params.code || '',
              }).toString(),
            });

            if (!response.ok) {
              const error = await response.text();
              console.error('[NextAuth] Token request failed:', error);
              throw new Error(error);
            }

            const tokens = await response.json();
            console.log('[NextAuth] Token request successful');
            return tokens;
          } catch (error) {
            console.error('[NextAuth] Token request error:', error);
            throw error;
          }
        },
      },
      userinfo: {
        url: 'https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}',
        async request({ tokens }) {
          try {
            console.log('[NextAuth] Userinfo request started');
            const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`, {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            });

            if (!response.ok) {
              const error = await response.text();
              console.error('[NextAuth] Userinfo request failed:', error);
              throw new Error(error);
            }

            const profile = await response.json();
            console.log('[NextAuth] Userinfo request successful');
            return profile;
          } catch (error) {
            console.error('[NextAuth] Userinfo request error:', error);
            throw error;
          }
        },
      },
      profile(profile) {
        return {
          id: profile.user_id || profile.user || 'unknown',
          name: profile.hub_domain || 'unknown',
          email: profile.user || 'unknown',
        };
      },
      clientId: HUBSPOT_CONFIG.clientId,
      clientSecret: HUBSPOT_CONFIG.clientSecret,
    },
  ],
  debug: true,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}; 