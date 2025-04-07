import { NextAuthOptions, getServerSession } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { randomUUID } from 'crypto';

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
      if (!session.user) {
        console.log('No user object in session during callback');
        session.user = { id: '', email: '', role: 'user' };
      }
      
      console.log('Session callback called with token:', { 
        tokenSub: token.sub,
        tokenEmail: token.email,
        tokenName: token.name,
        tokenRole: token.role,
        tokenOrgId: token.organizationId,
      });

      // Always ensure user.id is set from token.sub
      if (token.sub) {
        session.user.id = token.sub;
        
        // Fetch fresh user data from database 
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, organizationId: true, role: true, email: true },
        });

        console.log('User data from database:', user);

        if (user) {
          session.user.id = user.id;  // Ensure ID is set
          session.user.organizationId = user.organizationId || undefined;
          session.user.role = user.role;
          
          // If email is missing, use the one from database
          if (!session.user.email && user.email) {
            session.user.email = user.email;
          }
        } else {
          console.log('User not found in database with ID:', token.sub);
        }
      } else {
        console.log('No token.sub available in session callback');
      }
      
      console.log('Session after updates:', { 
        userId: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        role: session.user?.role,
        orgId: session.user?.organizationId
      });
      
      return session;
    },
    async jwt({ token, user }) {
      console.log('JWT callback called with:', { 
        tokenSub: token.sub, 
        userId: user?.id,
        userEmail: user?.email
      });
      
      if (user) {
        // Make sure token.sub is set from user.id
        token.sub = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        
        console.log('JWT updated with user data:', { 
          tokenSub: token.sub,
          tokenRole: token.role,
          tokenOrgId: token.organizationId
        });
      }
      return token;
    }
  },
  pages: {
    signIn: '/auth/login',
  }
};

export async function getOrganization() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.organizationId) {
    return null;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId }
  });

  return organization;
}
