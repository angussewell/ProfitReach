import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting webhook URL update...');

  try {
    // Get all organizations without webhook URLs
    const organizations = await prisma.organization.findMany({
      where: {
        webhookUrl: null
      }
    });

    console.log(`Found ${organizations.length} organizations without webhook URLs`);

    // Update each organization with a unique webhook URL
    for (const org of organizations) {
      const webhookUrl = randomUUID();
      await prisma.organization.update({
        where: { id: org.id },
        data: { webhookUrl }
      });
      console.log(`Updated organization ${org.name} with webhook URL: ${webhookUrl}`);
    }

    console.log('Webhook URL update completed successfully');
  } catch (error) {
    console.error('Error updating webhook URLs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 