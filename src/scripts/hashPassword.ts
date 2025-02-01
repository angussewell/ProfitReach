import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function hashPassword(email: string, newPassword: string) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    if (!user) {
      console.error('User not found:', email);
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('Password updated successfully for:', email);
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

// Example usage:
// hashPassword('user@example.com', 'newPassword'); 