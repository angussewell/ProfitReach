import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const GHL_SCOPES = [
  // Required base scopes for location selection
  'companies.readonly',
  'locations.readonly',
  
  // Additional scopes for our functionality
  'contacts.readonly',
  'contacts.write',
  'locations.write',
  'businesses.readonly',
  'businesses.write',
  'conversations.readonly',
  'conversations.write',
  'tasks.readonly',
  'tasks.write'
];

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
        url: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
        params: {
          scope: GHL_SCOPES.join(' '),
          response_type: 'code',
          userType: 'Location'
        }
      },
      token: {
        url: 'https://services.leadconnectorhq.com/oauth/token',
        params: { grant_type: 'authorization_code' },
        async request({ params, provider, client }) {
          const tokenUrl = (typeof provider.token === 'string' ? provider.token : provider.token?.url) || 'https://services.leadconnectorhq.com/oauth/token';
          
          // Convert params to URLSearchParams
          const formData = new URLSearchParams();
          formData.append('client_id', client.client_id as string);
          formData.append('client_secret', client.client_secret as string);
          formData.append('grant_type', params.grant_type as string);
          formData.append('code', params.code as string);
          if (client.redirect_uri && typeof client.redirect_uri === 'string') {
            formData.append('redirect_uri', client.redirect_uri);
          }
          
          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Version': '2021-07-28'
            },
            body: formData
          });
          
          const tokens = await response.json();
          if (!response.ok) throw tokens;
          return tokens;
        }
      },
      userinfo: {
        url: 'https://services.leadconnectorhq.com/oauth/userinfo'
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
      console.log('SignIn Callback:', { user, account, profile });
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
      
      console.log('JWT Token after update:', token);
      
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback:', {
        tokenId: token?.id,
        sessionUserId: session?.user?.id,
        timestamp: token?._timestamp
      });

      if (token) {
        session.user = {
          id: token.id,
          email: token.email || undefined,
          name: token.name || undefined,
          role: token.role,
          organizationId: token.organizationId || undefined,
          organizationName: token.organizationName
        };
        session._timestamp = token._timestamp;
      }

      console.log('Session after update:', {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        organizationId: session.user.organizationId,
        timestamp: session._timestamp
      });

      return session;
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 