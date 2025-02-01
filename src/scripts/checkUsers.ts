import { prisma } from '@/lib/prisma';

type UserInfo = {
  id: string;
  email: string | null;
  role: string;
  password: string | null;
  organizationId: string | null;
};

async function checkUsers() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        organizationId: true
      }
    });

    // Group users by email
    const usersByEmail = users.reduce<Record<string, UserInfo[]>>((acc, user) => {
      if (!user.email) return acc;
      if (!acc[user.email]) acc[user.email] = [];
      acc[user.email].push(user as UserInfo);
      return acc;
    }, {});

    // Find duplicates
    Object.entries(usersByEmail).forEach(([email, users]) => {
      if (users.length > 1) {
        console.log('\nDuplicate users found for email:', email);
        users.forEach(user => {
          console.log('User:', {
            id: user.id,
            role: user.role,
            hasPassword: !!user.password,
            organizationId: user.organizationId
          });
        });
      }
    });

    // Find users without passwords
    const usersWithoutPassword = users.filter(user => !user.password);
    if (usersWithoutPassword.length > 0) {
      console.log('\nUsers without passwords:');
      usersWithoutPassword.forEach(user => {
        console.log('User:', {
          id: user.id,
          email: user.email,
          role: user.role
        });
      });
    }
  } catch (error) {
    console.error('Error checking users:', error);
  }
}

// Run the check
checkUsers(); 