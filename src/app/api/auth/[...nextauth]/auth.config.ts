import { AuthOptions } from 'next-auth';
import { HUBSPOT_CONFIG } from '@/config/hubspot';

// Add detailed environment variable validation at the top
if (!process.env.HUBSPOT_CLIENT_ID) {
  console.error('[NextAuth] Missing HUBSPOT_CLIENT_ID');
}
if (!process.env.HUBSPOT_CLIENT_SECRET) {
  console.error('[NextAuth] Missing HUBSPOT_CLIENT_SECRET');
}
if (!process.env.NEXTAUTH_URL) {
  console.error('[NextAuth] Missing NEXTAUTH_URL');
}
if (!process.env.NEXTAUTH_SECRET) {
  console.error('[NextAuth] Missing NEXTAUTH_SECRET');
}

// Log all environment variables (excluding secrets)
console.log('[NextAuth] Environment Variables:', {
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nodeEnv: process.env.NODE_ENV,
  hasHubspotClientId: !!process.env.HUBSPOT_CLIENT_ID,
  hasHubspotClientSecret: !!process.env.HUBSPOT_CLIENT_SECRET,
  hubspotRedirectUri: HUBSPOT_CONFIG.redirectUri,
  hubspotScopes: HUBSPOT_CONFIG.scopes,
});

export const authOptions: AuthOptions = {
  providers: [
    {
      id: 'hubspot',
      name: 'HubSpot',
      type: 'oauth',
      wellKnown: 'https://api.hubapi.com/.well-known/openid-configuration',
      authorization: {
        url: 'https://app.hubspot.com/oauth/authorize',
        params: {
          scope: HUBSPOT_CONFIG.scopes.join(' '),
          client_id: HUBSPOT_CONFIG.clientId!,
          response_type: 'code',
          redirect_uri: HUBSPOT_CONFIG.redirectUri,
        },
      },
      token: {
        url: 'https://api.hubapi.com/oauth/v1/token',
        async request({ params, provider }) {
          try {
            console.log('[NextAuth] Token request started with params:', {
              hasCode: !!params.code,
              redirectUri: HUBSPOT_CONFIG.redirectUri,
              clientId: HUBSPOT_CONFIG.clientId,
              provider: provider.id,
              scopes: HUBSPOT_CONFIG.scopes,
            });

            // Ensure we have all required parameters
            if (!params.code) {
              throw new Error('No code parameter received');
            }

            if (!HUBSPOT_CONFIG.clientId || !HUBSPOT_CONFIG.clientSecret) {
              throw new Error('Missing client credentials');
            }

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
                code: params.code,
              }).toString(),
            });

            const responseText = await response.text();
            console.log('[NextAuth] Token response:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              responsePreview: responseText.substring(0, 100),
            });

            if (!response.ok) {
              console.error('[NextAuth] Token request failed:', {
                status: response.status,
                statusText: response.statusText,
                response: responseText,
              });
              throw new Error(`Token request failed: ${response.status} - ${responseText}`);
            }

            const tokenResponse = JSON.parse(responseText);
            console.log('[NextAuth] Token parsed successfully');
            return tokenResponse;
          } catch (error) {
            console.error('[NextAuth] Token request error:', error);
            throw error;
          }
        },
      },
      userinfo: {
        url: 'https://api.hubapi.com/oauth/v1/access-tokens',
        async request({ tokens }) {
          try {
            console.log('[NextAuth] Userinfo request started:', {
              hasAccessToken: !!tokens.access_token,
            });

            if (!tokens.access_token) {
              throw new Error('No access token available');
            }

            const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`, {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
              },
            });

            const responseText = await response.text();
            console.log('[NextAuth] Userinfo response:', {
              status: response.status,
              statusText: response.statusText,
              responsePreview: responseText.substring(0, 100),
            });

            if (!response.ok) {
              console.error('[NextAuth] Userinfo request failed:', {
                status: response.status,
                statusText: response.statusText,
                response: responseText,
              });
              throw new Error(`Userinfo request failed: ${response.status} - ${responseText}`);
            }

            const userInfo = JSON.parse(responseText);
            console.log('[NextAuth] Userinfo parsed successfully');
            return {
              sub: userInfo.user_id || 'unknown',
              name: userInfo.hub_domain || 'unknown',
              email: userInfo.user || 'unknown',
            };
          } catch (error) {
            console.error('[NextAuth] Userinfo request error:', error);
            throw error;
          }
        },
      },
      profile(profile) {
        console.log('[NextAuth] Processing profile:', profile);
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
        };
      },
      clientId: HUBSPOT_CONFIG.clientId,
      clientSecret: HUBSPOT_CONFIG.clientSecret,
    },
  ],
  debug: true,
  callbacks: {
    async jwt({ token, account }) {
      console.log('[NextAuth] JWT callback:', { hasToken: !!token, hasAccount: !!account });
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth] Session callback:', { hasSession: !!session, hasToken: !!token });
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}; 