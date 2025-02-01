const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fix() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('littleWinn16', 12);
    
    // Update the user's password
    const user = await prisma.user.update({
      where: { email: 'admin@profitreach.com' },
      data: { password: hashedPassword }
    });

    console.log('User password updated:', {
      id: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fix(); 