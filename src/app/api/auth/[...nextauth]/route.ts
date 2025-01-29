import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string;
      name?: string;
      role: string;
      organizationId?: string;
      organizationName?: string;
      ghlAccessToken?: string;
      ghlRefreshToken?: string;
    };
    _timestamp?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    role: string;
    organizationId?: string;
    organizationName?: string;
    ghlAccessToken?: string;
    ghlRefreshToken?: string;
    _timestamp?: number;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true }
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        console.log('User authorized:', {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        });

        return {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          role: user.role,
          organizationId: user.organizationId || undefined,
          organizationName: user.organization?.name
        };
      }
    }),
    {
      id: 'gohighlevel',
      name: 'GoHighLevel',
      type: 'oauth',
      version: '2.0',
      authorization: {
        url: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
        params: {
          scope: 'businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly locations.write conversations.readonly conversations.write locations/tasks.readonly locations/tasks.write',
          response_type: 'code',
          user_type: 'Location',
          loginWindowOpenMode: 'self'
        }
      },
      token: {
        url: 'https://services.leadconnectorhq.com/oauth/token',
        params: { 
          grant_type: 'authorization_code'
        },
        async request({ params, provider, client }) {
          console.log('Token Request Starting:', { 
            code: params.code,
            clientId: client.client_id,
            redirectUri: client.redirect_uri 
          });
          
          const tokenUrl = 'https://services.leadconnectorhq.com/oauth/token';
          
          // Convert params to URLSearchParams
          const formData = new URLSearchParams();
          formData.append('client_id', client.client_id as string);
          formData.append('client_secret', client.client_secret as string);
          formData.append('grant_type', 'authorization_code');
          formData.append('code', params.code as string);
          formData.append('redirect_uri', client.redirect_uri as string);
          
          console.log('Token Request URL:', tokenUrl);
          console.log('Token Request Body:', formData.toString());
          
          try {
            const response = await fetch(tokenUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Version': '2021-07-28'
              },
              body: formData
            });
            
            const tokens = await response.json();
            console.log('Token Response:', { 
              status: response.status, 
              ok: response.ok,
              error: !response.ok ? tokens : undefined
            });
            
            if (!response.ok) {
              throw new Error(JSON.stringify(tokens));
            }
            
            return tokens;
          } catch (error) {
            console.error('Token Exchange Error:', error);
            throw error;
          }
        }
      },
      userinfo: {
        url: 'https://services.leadconnectorhq.com/oauth/userinfo',
        async request({ tokens, provider }) {
          const userinfoUrl = 'https://services.leadconnectorhq.com/oauth/userinfo';
          const response = await fetch(userinfoUrl, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Version': '2021-07-28'
            }
          });
          
          const profile = await response.json();
          console.log('Userinfo Response:', { status: response.status, ok: response.ok, profile });
          
          if (!response.ok) {
            console.error('Userinfo Error:', profile);
            throw profile;
          }
          return profile;
        }
      },
      checks: ['state'],
      clientId: process.env.NEXT_PUBLIC_GHL_CLIENT_ID,
      clientSecret: process.env.GHL_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: 'user',
          organizationId: undefined
        }
      }
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn Callback:', { 
        userId: user?.id,
        accountType: account?.provider,
        hasProfile: !!profile 
      });
      return true;
    },
    async jwt({ token, user, account, profile, trigger, session }) {
      console.log('JWT Callback:', {
        trigger,
        tokenId: token?.id,
        userId: user?.id,
        sessionUserId: session?.user?.id,
        timestamp: session?._timestamp,
        account,
        profile
      });

      // Store the access token from GoHighLevel OAuth
      if (account && account.provider === 'gohighlevel') {
        token.ghlAccessToken = account.access_token;
        token.ghlRefreshToken = account.refresh_token;
      }

      if (user) {
        // Initial sign in
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
      }
      
      if (trigger === 'update') {
        // Always fetch fresh data on update
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: { organization: true }
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email || undefined;
          token.name = dbUser.name || undefined;
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId || undefined;
          token.organizationName = dbUser.organization?.name;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email || undefined,
          name: token.name || undefined,
          role: token.role,
          organizationId: token.organizationId || undefined,
          organizationName: token.organizationName,
          ghlAccessToken: token.ghlAccessToken,
          ghlRefreshToken: token.ghlRefreshToken
        };
        session._timestamp = token._timestamp;
      }

      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login' // Redirect all errors to login
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  },
  debug: true // Enable debug mode temporarily
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 