import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check against admin credentials
        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          // Create or get admin user
          const user = await prisma.user.upsert({
            where: { email: credentials.email },
            update: {},
            create: {
              email: credentials.email,
              name: process.env.ADMIN_NAME || 'Admin User',
              role: 'admin',
              organization: {
                create: {
                  name: 'Admin Organization',
                  webhookUrl: randomUUID(),
                }
              }
            },
            include: {
              organization: true,
            }
          });

          return {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role,
            organizationId: user.organizationId || undefined
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { organizationId: true, role: true },
        });

        if (user) {
          session.user.organizationId = user.organizationId || undefined;
          session.user.role = user.role;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    }
  },
  pages: {
    signIn: '/auth/login',
  }
};

export async function getOrganization() {
  const { userId } = auth();
  
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization: true
    }
  });

  return user?.organization;
} 