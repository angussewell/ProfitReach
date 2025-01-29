import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const GHL_SCOPES = [
  'businesses.readonly',
  'businesses.write',
  'custom-menu-link.write',
  'custom-menu-link.readonly',
  'emails/builder.readonly',
  'emails/builder.write',
  'users.readonly',
  'users.write',
  'workflows.readonly',
  'oauth.readonly',
  'oauth.write',
  'opportunities.readonly',
  'opportunities.write',
  'locations/customFields.write',
  'locations/customFields.readonly',
  'locations/customValues.write',
  'locations/customValues.readonly',
  'conversations/message.readonly',
  'conversations/message.write',
  'conversations/reports.readonly',
  'conversations/livechat.write',
  'conversations.write',
  'conversations.readonly',
  'campaigns.readonly',
  'companies.readonly'
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
        params: { grant_type: 'authorization_code' }
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