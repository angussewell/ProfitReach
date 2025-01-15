import { AuthOptions, TokenSet, EventCallbacks } from 'next-auth';
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
      token: {
        url: 'https://api.hubapi.com/oauth/v1/token',
        async request({ client, params, checks, provider }) {
          console.log('[NextAuth] Token request params:', {
            grantType: params.grant_type,
            hasCode: !!params.code,
            hasRedirectUri: !!params.redirect_uri,
          });

          const tokenUrl = typeof provider.token === 'string' 
            ? provider.token 
            : provider.token?.url;

          if (!tokenUrl) {
            throw new Error('Token URL is not configured');
          }

          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: HUBSPOT_CONFIG.clientId,
              client_secret: HUBSPOT_CONFIG.clientSecret,
              redirect_uri: HUBSPOT_CONFIG.redirectUri,
              code: params.code as string,
            }),
          });

          const tokens = await response.json();

          if (!response.ok) {
            console.error('[NextAuth] Token exchange failed:', tokens);
            throw new Error(tokens.message || 'Failed to exchange authorization code');
          }

          console.log('[NextAuth] Token exchange successful:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
          });

          return tokens;
        },
      },
      userinfo: {
        url: 'https://api.hubapi.com/oauth/v1/access-tokens',
        async request({ tokens }) {
          try {
            const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens', {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            });
            
            if (!response.ok) {
              console.error('[NextAuth] Failed to fetch user info:', await response.text());
              throw new Error('Failed to fetch user info');
            }

            const data = await response.json();
            console.log('[NextAuth] User info fetched:', {
              hasUser: !!data.user,
              hasHubDomain: !!data.hub_domain,
            });

            return {
              id: data.user,
              name: data.hub_domain,
              email: data.user,
            };
          } catch (error) {
            console.error('[NextAuth] Error fetching user info:', error);
            throw error;
          }
        },
      },
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
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        console.log('[NextAuth] Received account in JWT callback:', {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
        });
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.hubspotPortalId = account.hubspotPortalId;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth] Building session:', {
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        hasPortalId: !!token.hubspotPortalId,
      });
      return {
        ...session,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        hubspotPortalId: token.hubspotPortalId
      };
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth] Redirect callback:', { url, baseUrl });
      // Always allow callback URLs
      if (url.startsWith('/api/auth/callback')) {
        return url;
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allow URLs from the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('[NextAuth] Sign in event:', { user, account, isNewUser });
    },
    async signOut({ session, token }) {
      console.log('[NextAuth] Sign out event:', { session, token });
    },
  },
}; 