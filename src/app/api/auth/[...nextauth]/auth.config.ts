import { AuthOptions } from 'next-auth';
import { HUBSPOT_CONFIG } from '@/config/hubspot';

// Validate required environment variables
if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is not set');
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is not set');
}

if (!HUBSPOT_CONFIG.clientId) {
  throw new Error('HUBSPOT_CLIENT_ID environment variable is not set');
}

if (!HUBSPOT_CONFIG.clientSecret) {
  throw new Error('HUBSPOT_CLIENT_SECRET environment variable is not set');
}

// Log all environment variables (excluding secrets)
console.log('Environment Variables:', {
  nextAuthUrl: process.env.NEXTAUTH_URL,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nodeEnv: process.env.NODE_ENV,
  hasHubspotClientId: !!process.env.HUBSPOT_CLIENT_ID,
  hasHubspotClientSecret: !!process.env.HUBSPOT_CLIENT_SECRET,
  hubspotRedirectUri: process.env.HUBSPOT_REDIRECT_URI,
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
          scope: HUBSPOT_CONFIG.scopes.join(' '),
          client_id: HUBSPOT_CONFIG.clientId,
          response_type: 'code',
        },
      },
      token: {
        url: 'https://api.hubapi.com/oauth/v1/token',
        async request({ params }) {
          try {
            console.log('Token request started with params:', {
              hasCode: !!params.code,
              redirectUri: HUBSPOT_CONFIG.redirectUri,
            });

            const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: HUBSPOT_CONFIG.clientId!,
                client_secret: HUBSPOT_CONFIG.clientSecret!,
                redirect_uri: HUBSPOT_CONFIG.redirectUri,
                code: params.code as string,
              }),
            });

            const data = await response.text();
            console.log('Token response:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              data: data.substring(0, 100) + '...' // Log first 100 chars to avoid sensitive data
            });

            if (!response.ok) {
              throw new Error(`Token request failed: ${response.status} - ${data}`);
            }

            return JSON.parse(data);
          } catch (error) {
            console.error('Token request error:', error);
            throw error;
          }
        },
      },
      userinfo: {
        url: 'https://api.hubapi.com/oauth/v1/access-tokens',
        async request({ tokens }) {
          try {
            console.log('Userinfo request started');
            const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens', {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
              },
            });

            if (!response.ok) {
              const error = await response.text();
              console.error('Userinfo request failed:', {
                status: response.status,
                statusText: response.statusText,
                error
              });
              throw new Error(`Failed to fetch user info: ${error}`);
            }

            const data = await response.json();
            console.log('Userinfo response:', {
              status: response.status,
              hasData: !!data
            });
            return data;
          } catch (error) {
            console.error('Userinfo request error:', error);
            throw error;
          }
        },
      },
      profile(profile) {
        console.log('Processing profile:', {
          hasUser: !!profile.user,
          hasHubDomain: !!profile.hub_domain
        });
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account }) {
      console.log('JWT callback:', {
        hasToken: !!token,
        hasAccount: !!account,
        accountType: account?.type
      });
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', {
        hasToken: !!token,
        sessionExpiry: session.expires
      });
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  logger: {
    error(code, ...message) {
      console.error('NextAuth Error:', { code, message });
    },
    warn(code, ...message) {
      console.warn('NextAuth Warning:', { code, message });
    },
    debug(code, ...message) {
      console.log('NextAuth Debug:', { code, message });
    },
  },
}; 