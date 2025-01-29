import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      ghlAccessToken?: string;
      ghlRefreshToken?: string;
      organizationId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name?: string;
    email?: string;
    ghlAccessToken?: string;
    ghlRefreshToken?: string;
    accessTokenExpires?: number;
    organizationId?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    {
      id: 'gohighlevel',
      name: 'GoHighLevel',
      type: 'oauth',
      version: '2.0',
      clientId: process.env.NEXT_PUBLIC_GHL_CLIENT_ID,
      clientSecret: process.env.GHL_CLIENT_SECRET,
      authorization: {
        url: 'https://services.leadconnectorhq.com/oauth/authorize',
        params: {
          scope: 'businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly locations.write conversations.readonly conversations.write locations/tasks.readonly locations/tasks.write oauth.readonly oauth.write',
          response_type: 'code',
          user_type: 'Location'
        }
      },
      token: {
        url: 'https://services.leadconnectorhq.com/oauth/token',
        params: { 
          grant_type: 'authorization_code',
          user_type: 'Location'
        }
      },
      userinfo: {
        url: 'https://services.leadconnectorhq.com/oauth/userinfo'
      },
      profile(profile) {
        return {
          id: profile.locationId || profile.id,
          name: profile.name,
          email: profile.email,
          role: 'user'
        };
      }
    }
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          ...user,
          ghlAccessToken: account.access_token,
          ghlRefreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000
        };
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      try {
        const formData = new URLSearchParams();
        formData.append('client_id', process.env.NEXT_PUBLIC_GHL_CLIENT_ID!);
        formData.append('client_secret', process.env.GHL_CLIENT_SECRET!);
        formData.append('grant_type', 'refresh_token');
        formData.append('refresh_token', token.ghlRefreshToken as string);
        formData.append('user_type', 'Location');

        const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Version': '2021-07-28'
          },
          body: formData
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          throw refreshedTokens;
        }
        
        return {
          ...token,
          ghlAccessToken: refreshedTokens.access_token,
          ghlRefreshToken: refreshedTokens.refresh_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          organizationId: token.organizationId
        };
      } catch (error) {
        console.error('Error refreshing access token:', error);
        return {
          ...token,
          error: 'RefreshAccessTokenError',
          organizationId: token.organizationId
        };
      }
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id,
        ghlAccessToken: token.ghlAccessToken,
        ghlRefreshToken: token.ghlRefreshToken,
        organizationId: token.organizationId
      };
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 