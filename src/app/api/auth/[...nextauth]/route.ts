import NextAuth, { TokenSet, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { AuthOptions } from 'next-auth';
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

const hubspotProvider = {
  id: 'hubspot',
  name: 'HubSpot',
  type: 'oauth' as const,
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
    async request(context: TokenEndpointContext) {
      try {
        console.log('Token request context:', {
          clientId: HUBSPOT_CONFIG.clientId,
          hasClientSecret: !!HUBSPOT_CONFIG.clientSecret,
          code: context.params.code,
          redirectUri: HUBSPOT_CONFIG.redirectUri
        });
        
        const tokenParams = {
          grant_type: 'authorization_code',
          client_id: HUBSPOT_CONFIG.clientId!,
          client_secret: HUBSPOT_CONFIG.clientSecret!,
          redirect_uri: HUBSPOT_CONFIG.redirectUri,
          code: context.params.code as string,
        };
        
        const response = await fetch(context.provider.token.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenParams),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Token request failed:', error);
          throw new Error('Failed to get access token');
        }

        const tokens = await response.json();
        console.log('Received tokens:', { ...tokens, access_token: '***', refresh_token: '***' });
        return tokens as TokenEndpointResponse;
      } catch (error) {
        console.error('Token request error:', error);
        throw error;
      }
    }
  },
  userinfo: {
    url: 'https://api.hubapi.com/oauth/v1/access-tokens',
    async request({ tokens }: { tokens: HubSpotTokens }) {
      try {
        const response = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch user info:', errorText);
          throw new Error('Failed to fetch user info');
        }

        const profile = await response.json();
        console.log('User profile:', profile);
        return profile as HubSpotProfile;
      } catch (error) {
        console.error('Error in userinfo request:', error);
        throw error;
      }
    },
  },
  profile(profile: HubSpotProfile) {
    return {
      id: profile.user,
      name: profile.hub_domain,
      email: profile.user,
    };
  },
  clientId: HUBSPOT_CONFIG.clientId,
  clientSecret: HUBSPOT_CONFIG.clientSecret,
} as const;

export const authOptions: AuthOptions = {
  providers: [hubspotProvider as unknown as OAuthConfig<any>],
  debug: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, trigger }) {
      if (account) {
        console.log('Processing JWT with account:', { ...account, access_token: '***', refresh_token: '***' });
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = Math.floor(Date.now() / 1000 + (account as unknown as HubSpotAccount).expires_in);
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

          if (!response.ok) {
            const error = await response.text();
            console.error('Token refresh failed:', error);
            throw new Error('RefreshAccessTokenError');
          }

          const refreshedTokens = await response.json();
          console.log('Refreshed tokens:', { ...refreshedTokens, access_token: '***', refresh_token: '***' });

          token.accessToken = refreshedTokens.access_token;
          token.refreshToken = refreshedTokens.refresh_token ?? token.refreshToken;
          token.expiresAt = Math.floor(Date.now() / 1000 + refreshedTokens.expires_in);
        } catch (error) {
          console.error('Error refreshing access token:', error);
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }

      return token;
    },
    async session({ session, token }: { session: ExtendedSession; token: ExtendedToken }) {
      console.log('Processing session with token');
      
      if (token.error) {
        throw new Error(token.error);
      }

      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl });
      
      // Handle callback URLs
      if (url.includes('/api/auth/callback/')) {
        const finalUrl = `${baseUrl}${url.split(baseUrl)[1]}`;
        console.log('Handling callback URL:', finalUrl);
        return finalUrl;
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        const finalUrl = `${baseUrl}${url}`;
        console.log('Handling relative URL:', finalUrl);
        return finalUrl;
      }
      
      // Handle absolute URLs
      if (url.startsWith(baseUrl)) {
        console.log('Handling absolute URL:', url);
        return url;
      }
      
      console.log('Defaulting to base URL:', baseUrl);
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 