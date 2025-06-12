import { NextAuthOptions, getServerSession } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs'; // Import bcryptjs

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
      async authorize(credentials, req) { // Added req parameter
        console.log("AUTHORIZE: Received credentials:", credentials ? { email: credentials.email, hasPassword: !!credentials.password } : null); // Log input safely

        try {
          // Check for missing credentials first
          if (!credentials?.email || !credentials?.password) {
            console.log("AUTHORIZE: Missing email or password");
            return null;
          }

          // Check against admin credentials (keep existing admin logic)
          if (
            credentials.email === process.env.ADMIN_EMAIL &&
            credentials.password === process.env.ADMIN_PASSWORD
          ) {
            console.log("AUTHORIZE: Attempting admin login");
            // Create or get admin user
            const user = await prisma.user.upsert({
              where: { email: credentials.email },
              update: {},
              create: {
                id: randomUUID(), // Explicitly set ID on creation
                email: credentials.email,
                name: process.env.ADMIN_NAME || 'Admin User',
                role: 'admin',
                updatedAt: new Date(), // Explicitly set updatedAt on creation
                Organization: { // Corrected casing
                  create: {
                    name: 'Admin Organization',
                    webhookUrl: randomUUID(),
                    updatedAt: new Date() // Explicitly set updatedAt on creation
                  }
                }
              },
              include: {
                Organization: true, // Corrected casing
              }
            });
            console.log(`AUTHORIZE: Admin login success! Returning user object for ${user.id}`);
            return {
              id: user.id,
              email: user.email ?? undefined, // Handle null from DB -> undefined for NextAuth
              name: user.name ?? undefined,   // Handle null from DB -> undefined for NextAuth
              role: user.role,
              organizationId: user.organizationId ?? undefined // Handle null from DB -> undefined for NextAuth
            };
          }

          // Standard user authentication logic
          let user = null;
          try {
            console.log(`AUTHORIZE: Finding user with email: ${credentials.email}`);
            user = await prisma.user.findUnique({ where: { email: credentials.email } });
            console.log("AUTHORIZE: User found from DB:", user ? { id: user.id, email: user.email, hasPassword: !!user.password } : null);
          } catch (dbError) {
            console.error("!!! AUTHORIZE: Database error finding user:", dbError);
            // Consider throwing a specific error or returning null based on desired behavior
            // Throwing an error might lead to a 500 if not caught globally by NextAuth
            return null; // Returning null indicates failure
          }

          if (!user || !user.password) { // Check if user exists AND has a password hash
            console.log(`AUTHORIZE: User not found or password not set for email: ${credentials.email}`);
            return null; // User not found or cannot use password auth
          }

          // Compare password
          let passwordsMatch = false;
          try {
            console.log(`AUTHORIZE: Comparing password for user ${user.id}`);
            passwordsMatch = await bcrypt.compare(credentials.password, user.password);
            console.log(`AUTHORIZE: Password comparison result for user ${user.id}: ${passwordsMatch}`);
          } catch (compareError) {
            console.error(`!!! AUTHORIZE: Password comparison error for user ${user.id}:`, compareError);
            // Again, consider throwing or returning null
            return null; // Indicate failure
          }

          if (passwordsMatch) {
            console.log(`AUTHORIZE: Success! Returning user object for ${user.id}`);
            // Return object MUST include id, and other fields needed by JWT/Session callbacks
            return {
              id: user.id,
              email: user.email ?? undefined, // Handle null from DB -> undefined for NextAuth
              name: user.name ?? undefined,   // Handle null from DB -> undefined for NextAuth
              role: user.role,
              organizationId: user.organizationId ?? undefined // Handle null from DB -> undefined for NextAuth
              // DO NOT return the password hash
            };
          } else {
            console.log(`AUTHORIZE: Password mismatch for user ${user.id}`);
            return null; // Incorrect password
          }

        } catch (error) {
          console.error("!!! AUTHORIZE: Unhandled error in authorize function:", error);
          // Returning null tells NextAuth credentials are invalid or an error occurred
          return null;
        }
      } // End of authorize function
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
