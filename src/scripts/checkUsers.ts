const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

type User = {
  id: string;
  email: string | null;
  role: string;
  password: string | null;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
  } | null;
};

async function checkUsers() {
  try {
    // Get all users with complete data
    const users = await prisma.user.findMany({
      include: {
        organization: true
      }
    }) as User[];

    console.log('\nAll Users:');
    users.forEach((user: User) => {
      console.log('\nUser Details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPassword: !!user.password,
        organizationId: user.organizationId,
        organization: user.organization ? {
          id: user.organization.id,
          name: user.organization.name
        } : null
      });
    });

    // Group users by email to find duplicates
    const usersByEmail = users.reduce<Record<string, User[]>>((acc, user) => {
      if (!user.email) return acc;
      if (!acc[user.email]) acc[user.email] = [];
      acc[user.email].push(user);
      return acc;
    }, {});

    console.log('\nDuplicate Users:');
    Object.entries(usersByEmail).forEach(([email, users]) => {
      if (users.length > 1) {
        console.log('\nDuplicate users found for email:', email);
        users.forEach((user: User) => {
          console.log('User:', {
            id: user.id,
            role: user.role,
            hasPassword: !!user.password,
            organizationId: user.organizationId,
            organizationName: user.organization?.name
          });
        });
      }
    });

    console.log('\nUsers without passwords:');
    const usersWithoutPassword = users.filter((user: User) => !user.password);
    usersWithoutPassword.forEach((user: User) => {
      console.log('User:', {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationName: user.organization?.name
      });
    });

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUsers(); 