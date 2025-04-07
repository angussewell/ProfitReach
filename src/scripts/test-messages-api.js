// Testing script for messages API raw SQL queries
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  console.log('Starting test for messages API raw SQL');

  // Organization ID to test with - replace with a valid one from your database
  const testOrgId = 'cm7bzmp920001jx03t6lf4kee';  // Use the organization ID we saw in the logs

  console.log(`Testing with organization ID: ${testOrgId}`);

  // Test the count query
  try {
    console.log('Testing COUNT query...');
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM "EmailMessage" 
      WHERE "organizationId" = ${testOrgId}
    `;
    
    const messageCount = Number(countResult[0]?.count) || 0;
    console.log(`Count result: ${messageCount} messages found`);
  } catch (error) {
    console.error('Count query failed:', error);
  }

  // Test the SELECT query
  try {
    console.log('\nTesting SELECT query...');
    const messages = await prisma.$queryRaw`
      SELECT * FROM "EmailMessage" 
      WHERE "organizationId" = ${testOrgId}
      ORDER BY "receivedAt" DESC
      LIMIT 5
    `;

    console.log(`SELECT result: ${messages.length} messages retrieved`);
    if (messages.length > 0) {
      console.log('First message sample:');
      console.log(JSON.stringify({
        id: messages[0].id,
        subject: messages[0].subject,
        messageType: messages[0].messageType,
        status: messages[0].status
      }, null, 2));
    } else {
      console.log('No messages found for this organization');
    }
  } catch (error) {
    console.error('SELECT query failed:', error);
  }

  // If no messages found, let's check if the table exists and has the expected schema
  try {
    console.log('\nChecking if EmailMessage table exists and its schema:');
    const tableCheck = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'EmailMessage'
      ORDER BY ordinal_position
    `;
    
    console.log(`Table schema: ${tableCheck.length} columns found`);
    console.log(tableCheck);
  } catch (error) {
    console.error('Table schema check failed:', error);
  }

  console.log('\nTest complete');
}

main()
  .catch(e => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
