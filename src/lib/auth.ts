import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';

// Extend the built-in types
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      organizationName: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    organizationId: string;
    organizationName: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            organization: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          organizationId: user.organizationId || '',
          organizationName: user.organization?.name || ''
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
      } else if (trigger === 'update' && session?.user) {
        // Session update - use the provided session data
        token.organizationId = session.user.organizationId;
        token.organizationName = session.user.organizationName;
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
          organizationId: token.organizationId,
          organizationName: token.organizationName
        }
      };
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt'
  }
};

export const auth = () => getServerSession(authOptions);

export const getValidToken = async (session: Session | null) => {
  if (!session?.user?.organizationId) {
    throw new Error('No valid session found');
  }

  const integration = await prisma.gHLIntegration.findFirst({
    where: {
      organizationId: session.user.organizationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!integration?.accessToken) {
    throw new Error('No valid integration found');
  }

  return integration.accessToken;
}; 