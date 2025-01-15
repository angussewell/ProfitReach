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

// Log configuration for debugging
console.log('OAuth Configuration:', {
  nextAuthUrl: process.env.NEXTAUTH_URL,
  redirectUri: HUBSPOT_CONFIG.redirectUri,
  scopes: HUBSPOT_CONFIG.scopes,
  hasClientId: !!HUBSPOT_CONFIG.clientId,
  hasClientSecret: !!HUBSPOT_CONFIG.clientSecret,
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
          console.log('Token request started');
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
          console.log('Token response:', { status: response.status, data });

          if (!response.ok) {
            throw new Error(`Token request failed: ${response.status} - ${data}`);
          }

          return JSON.parse(data);
        },
      },
      userinfo: {
        url: 'https://api.hubapi.com/oauth/v1/access-tokens',
        async request({ tokens }) {
          console.log('Userinfo request started');
          const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens', {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            },
          });

          const data = await response.json();
          console.log('Userinfo response:', { status: response.status });
          return data;
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
  debug: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account }) {
      console.log('JWT callback:', { hasAccount: !!account });
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { hasToken: !!token });
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