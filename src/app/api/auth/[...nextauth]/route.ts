// Force new deployment - OAuth configuration update
import NextAuth, { TokenSet, Session } from 'next-auth';
import type { AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import { HUBSPOT_CONFIG } from '@/config/hubspot';

if (!process.env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL environment variable is not set');
}

interface HubSpotProfile {
  user: string;
  hub_domain: string;
  token: string;
}

interface HubSpotTokens extends TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenEndpointResponse extends TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface TokenEndpointContext {
  provider: {
    token: {
      url: string;
    };
  };
  params: {
    code?: string;
    [key: string]: string | undefined;
  };
}

interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
  expires: string;
}

interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

interface HubSpotAccount extends TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface HubSpotProvider {
  id: string;
  name: string;
  type: 'oauth';
  authorization: {
    url: string;
    params: {
      scope: string;
      client_id: string;
      response_type: string;
    };
  };
  token: {
    url: string;
    request: (context: TokenEndpointContext) => Promise<TokenEndpointResponse>;
  };
  userinfo: {
    url: string;
    request: (params: { tokens: HubSpotTokens }) => Promise<HubSpotProfile>;
  };
  profile: (profile: HubSpotProfile) => {
    id: string;
    name: string;
    email: string;
  };
  clientId: string | undefined;
  clientSecret: string | undefined;
}

const hubspotProvider: OAuthConfig<any> = {
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
    params: {
      grant_type: 'authorization_code',
      client_id: HUBSPOT_CONFIG.clientId,
      client_secret: HUBSPOT_CONFIG.clientSecret,
      redirect_uri: HUBSPOT_CONFIG.redirectUri
    }
  },
  userinfo: {
    url: 'https://api.hubapi.com/oauth/v1/access-tokens',
    request: async ({ tokens }) => {
      const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`);
      if (!response.ok) {
        console.error('Failed to fetch user info:', await response.text());
        throw new Error('Failed to fetch user info');
      }
      return await response.json();
    }
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
  style: {
    logo: '/hubspot.svg',
    logoDark: '/hubspot.svg',
    bg: '#ff7a59',
    text: '#fff',
    bgDark: '#ff7a59',
    textDark: '#fff',
  },
};

export const authOptions: AuthOptions = {
  providers: [hubspotProvider],
  debug: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        console.log('Processing JWT with account and user:', { 
          accountType: account.type,
          accountProvider: account.provider,
          userId: user.id,
          hasAccessToken: !!account.access_token
        });
        
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: Math.floor(Date.now() / 1000 + (account as unknown as HubSpotAccount).expires_in)
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        try {
          const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: HUBSPOT_CONFIG.clientId!,
              client_secret: HUBSPOT_CONFIG.clientSecret!,
              refresh_token: token.refreshToken as string,
            }),
          });

          const data = await response.text();
          console.log('Token refresh response:', data);

          if (!response.ok) {
            throw new Error(`Token refresh failed: ${data}`);
          }

          const refreshedTokens = JSON.parse(data);
          console.log('Refreshed tokens successfully');

          return {
            ...token,
            accessToken: refreshedTokens.access_token,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in)
          };
        } catch (error) {
          console.error('Error refreshing access token:', error);
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }

      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }) {
      console.log('Processing session with token:', {
        hasAccessToken: !!token.accessToken,
        hasError: !!token.error,
        sessionExpiry: session.expires
      });
      
      if (token.error) {
        console.error('Token error:', token.error);
        throw new Error(token.error);
      }

      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl });
      
      // Handle callback URLs
      if (url.startsWith('/api/auth/callback/')) {
        console.log('Handling callback URL:', url);
        return url;
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        const finalUrl = `${baseUrl}${url}`;
        console.log('Handling relative URL:', finalUrl);
        return finalUrl;
      }
      
      // Handle absolute URLs on same origin
      if (new URL(url).origin === baseUrl) {
        console.log('Handling same origin URL:', url);
        return url;
      }
      
      console.log('Defaulting to base URL:', baseUrl);
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 