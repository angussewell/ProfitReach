import NextAuth from 'next-auth';
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log('JWT Callback:', {
        trigger,
        tokenId: token?.id,
        userId: user?.id,
        sessionUserId: session?.user?.id,
        timestamp: session?._timestamp
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
    signIn: '/auth/login'
  },
  session: {
    strategy: 'jwt'
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 