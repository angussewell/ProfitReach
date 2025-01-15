import { AuthOptions } from 'next-auth';

if (!process.env.HUBSPOT_CLIENT_ID) throw new Error('HUBSPOT_CLIENT_ID is required');
if (!process.env.HUBSPOT_CLIENT_SECRET) throw new Error('HUBSPOT_CLIENT_SECRET is required');
if (!process.env.NEXTAUTH_URL) throw new Error('NEXTAUTH_URL is required');
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required');

const SCOPES = ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.marketing_events.read', 'oauth'];

// Get the appropriate redirect URI based on environment
const getRedirectUri = () => {
  // For local development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/api/auth/callback/hubspot';
  }
  // For Vercel production
  return `${process.env.NEXTAUTH_URL}/api/auth/callback/hubspot`;
};

console.log('[NextAuth] Using redirect URI:', getRedirectUri());

export const authOptions: AuthOptions = {
  providers: [
    {
      id: 'hubspot',
      name: 'HubSpot',
      type: 'oauth',
      authorization: {
        url: 'https://app.hubspot.com/oauth/authorize',
        params: {
          client_id: process.env.HUBSPOT_CLIENT_ID,
          scope: SCOPES.join(' '),
          response_type: 'code',
          redirect_uri: getRedirectUri(),
        },
      },
      token: 'https://api.hubapi.com/oauth/v1/token',
      userinfo: 'https://api.hubapi.com/oauth/v1/access-tokens',
      profile(profile) {
        return {
          id: profile.user,
          name: profile.hub_domain,
          email: profile.user,
        };
      },
      clientId: process.env.HUBSPOT_CLIENT_ID,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
      checks: ['state'],
    },
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
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
        hubspotPortalId: token.hubspotPortalId,
      };
    },
    async redirect({ url, baseUrl }) {
      // For development environment
      if (process.env.NODE_ENV === 'development' && url.includes('localhost')) {
        return url;
      }
      // For production environment
      if (url.startsWith('/api/auth/callback')) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
}; 