/**
 * Test the final solution for displaying actual email subjects from MailReef
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFinalSolution() {
  try {
    console.log('🧪 Testing final solution for webhook log subject display...\n');

    const webhookLogId = '6516eb43-7781-445d-919f-22fa731aaf36';
    
    // Simulate the page logic
    const log = await prisma.webhookLog.findUnique({
      where: { id: webhookLogId }
    });

    if (!log) {
      console.log('❌ Webhook log not found');
      return;
    }

    console.log('📋 Original Webhook Log:');
    console.log(`   Contact: ${log.contactEmail} (${log.contactName})`);
    console.log(`   Scenario: ${log.scenarioName}`);
    console.log(`   Original Subject: ${log.emailSubject.substring(0, 100)}...`);
    console.log('');

    // Try to find the actual email subject from MailReef messages
    let actualEmailSubject = log.emailSubject;
    
    if (log.contactEmail && log.organizationId) {
      // First, get the scenario ID for this webhook log
      const scenario = await prisma.scenario.findFirst({
        where: {
          name: log.scenarioName,
          organizationId: log.organizationId
        },
        select: { id: true }
      });

      if (scenario) {
        console.log(`🎯 Found scenario ID: ${scenario.id}`);

        // First, try to find a MailReef message sent to this specific contact for this scenario
        const exactMatch = await prisma.$queryRaw`
          SELECT mr.subject 
          FROM "MailReefMessage" mr
          JOIN "MailReefRecipient" mrr ON mr.id = mrr."mailReefMessageId"
          WHERE mr."scenarioId" = ${scenario.id}
            AND mr."organizationId" = ${log.organizationId}
            AND mrr."recipientEmail" = ${log.contactEmail}
            AND mr.direction = 'outbound'
          ORDER BY mr."eventTimestamp" DESC
          LIMIT 1
        `;

        if (exactMatch.length > 0) {
          actualEmailSubject = exactMatch[0].subject;
          console.log("✅ Found exact email subject match from MailReef!");
          console.log(`   Subject: ${actualEmailSubject}`);
        } else {
          console.log("🔍 No exact match found, trying fallback...");
          
          // Fallback: Get the most recent email subject from this scenario
          const fallbackMatch = await prisma.$queryRaw`
            SELECT mr.subject 
            FROM "MailReefMessage" mr
            WHERE mr."scenarioId" = ${scenario.id}
              AND mr."organizationId" = ${log.organizationId}
              AND mr.direction = 'outbound'
              AND mr.subject IS NOT NULL
              AND mr.subject != ''
            ORDER BY mr."eventTimestamp" DESC
            LIMIT 1
          `;

          if (fallbackMatch.length > 0) {
            actualEmailSubject = fallbackMatch[0].subject;
            console.log("✅ Found fallback email subject from MailReef scenario!");
            console.log(`   Subject: ${actualEmailSubject}`);
          } else {
            console.log("❌ No MailReef subjects found for this scenario");
          }
        }
      } else {
        console.log("❌ Scenario not found");
      }
    }

    console.log('\n📊 RESULTS:');
    console.log('=====================================');
    console.log(`BEFORE: ${log.emailSubject.substring(0, 80)}...`);
    console.log(`AFTER:  ${actualEmailSubject}`);
    console.log('=====================================');

    if (actualEmailSubject !== log.emailSubject) {
      console.log('🎉 SUCCESS! The subject line has been improved!');
      console.log('   The webhook log will now show a real email subject instead of the AI prompt.');
    } else {
      console.log('⚠️  No improvement found. The subject remains the same.');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFinalSolution();