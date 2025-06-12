// scripts/ensure-admin-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Create a Prisma instance
const prisma = new PrismaClient();

async function main() {
  console.log('Checking for admin users...');
  
  // Email addresses to check
  const adminEmails = [
    'angus@alpinegen.com',
    'omanwanyanwu@gmail.com', 
    process.env.ADMIN_EMAIL
  ].filter(Boolean);

  console.log(`Checking for admin users with emails: ${adminEmails.join(', ')}`);

  // Check if any of these users exist
  let existingAdmin = null;
  
  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (user) {
      existingAdmin = user;
      console.log(`Found existing admin user: ${user.email} (ID: ${user.id})`);
      break;
    }
  }

  // If no admin found, create one from environment variables
  if (!existingAdmin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    console.log(`Creating new admin user with email: ${process.env.ADMIN_EMAIL}`);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    try {
      // Create the admin user
      const newAdmin = await prisma.user.create({
        data: {
          email: process.env.ADMIN_EMAIL,
          name: process.env.ADMIN_NAME || 'Admin User',
          password: hashedPassword,
          role: 'admin',
        },
      });
      
      console.log(`Created new admin user with ID: ${newAdmin.id}`);
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  } else if (!existingAdmin) {
    console.warn('No existing admin users found and ADMIN_EMAIL/ADMIN_PASSWORD not set in .env.local');
    console.warn('Please set these values to create an admin user, or create one manually.');
  }

  console.log('Admin user check complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
