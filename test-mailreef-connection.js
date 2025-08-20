/**
 * Test script to verify the connection between webhook logs and MailReef messages
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMailReefConnection() {
  try {
    console.log('🔍 Testing MailReef message connection...\n');

    // Test the specific webhook log
    const webhookLogId = '6516eb43-7781-445d-919f-22fa731aaf36';
    
    const log = await prisma.webhookLog.findUnique({
      where: { id: webhookLogId }
    });

    if (!log) {
      console.log('❌ Webhook log not found');
      return;
    }

    console.log('📋 Webhook Log Details:');
    console.log(`   ID: ${log.id}`);
    console.log(`   Contact: ${log.contactEmail} (${log.contactName})`);
    console.log(`   Scenario: ${log.scenarioName}`);
    console.log(`   Created: ${log.createdAt}`);
    console.log(`   Current Subject: ${log.emailSubject}\n`);

    // Get the scenario ID
    const scenario = await prisma.scenario.findFirst({
      where: {
        name: log.scenarioName,
        organizationId: log.organizationId
      },
      select: { id: true, name: true }
    });

    if (!scenario) {
      console.log('❌ Scenario not found');
      return;
    }

    console.log('🎯 Found Scenario:');
    console.log(`   ID: ${scenario.id}`);
    console.log(`   Name: ${scenario.name}\n`);

    // Look for MailReef messages with this scenario ID
    const mailreefMessages = await prisma.$queryRaw`
      SELECT mr.id, mr.subject, mr."eventTimestamp", mrr."recipientEmail"
      FROM "MailReefMessage" mr
      JOIN "MailReefRecipient" mrr ON mr.id = mrr."mailReefMessageId"
      WHERE mr."scenarioId" = ${scenario.id}
        AND mr."organizationId" = ${log.organizationId}
        AND mr.direction = 'outbound'
      ORDER BY mr."eventTimestamp" DESC
      LIMIT 10
    `;

    console.log(`📧 Found ${mailreefMessages.length} MailReef messages for this scenario:`);
    
    if (mailreefMessages.length > 0) {
      mailreefMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. To: ${msg.recipientEmail}`);
        console.log(`      Subject: ${msg.subject}`);
        console.log(`      Time: ${msg.eventTimestamp}`);
        console.log(`      Match: ${msg.recipientEmail === log.contactEmail ? '✅ EXACT MATCH' : '❌ Different contact'}`);
        console.log('');
      });

      // Check if any match our contact email
      const matchingMessage = mailreefMessages.find(msg => msg.recipientEmail === log.contactEmail);
      
      if (matchingMessage) {
        console.log('🎉 SOLUTION FOUND!');
        console.log(`   Webhook log shows: "${log.emailSubject}"`);
        console.log(`   Actual email subject: "${matchingMessage.subject}"`);
        console.log(`   This should be displayed instead!\n`);
      } else {
        console.log('⚠️  No exact email match found, but we have related emails from the same scenario.');
        console.log('   We could show a representative subject line from this scenario.\n');
        
        if (mailreefMessages.length > 0) {
          console.log(`💡 Suggested fallback subject: "${mailreefMessages[0].subject}"`);
        }
      }
    } else {
      console.log('   No MailReef messages found for this scenario.');
      console.log('   This means either:');
      console.log('   - The emails haven\'t been sent through MailReef yet');
      console.log('   - The scenario ID doesn\'t match');
      console.log('   - The emails are still being processed');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMailReefConnection();