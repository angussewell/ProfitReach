import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Get the first organization
    const organization = await prisma.organization.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!organization) {
      console.error('No organization found');
      return;
    }

    if (!organization.webhookUrl) {
      console.error('Organization has no webhook URL');
      return;
    }

    console.log('Testing webhook for organization:', {
      name: organization.name,
      webhookUrl: organization.webhookUrl
    });

    // Send test webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/${organization.webhookUrl}`;
    console.log('Sending webhook to:', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: 'test-account',
        scenarioName: 'test-scenario',
        contactEmail: 'test@example.com',
        contactName: 'Test Contact',
        company: 'Test Company',
        customField: 'This is a custom field'
      })
    });

    const data = await response.json();
    console.log('Webhook response:', {
      status: response.status,
      data
    });

    if (response.ok) {
      // Verify webhook log was created
      const webhookLog = await prisma.webhookLog.findFirst({
        where: {
          organizationId: organization.id,
          scenarioName: 'test-scenario'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (webhookLog) {
        console.log('Webhook log created successfully:', {
          id: webhookLog.id,
          status: webhookLog.status
        });
      } else {
        console.error('Webhook log not found');
      }
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 
