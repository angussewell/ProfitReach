/**
 * Test script to verify the webhook log email subject fix
 * This script tests that when emailSubject contains a scenario name,
 * it gets processed to the actual subject line from the scenario.
 */

const organizationId = 'ae4addba-f910-496f-827e-fb6074d6ba05'; // Organization that has the Initial SOP Email scenarios
const scenarioName = 'Initial SOP Email 1'; // Scenario name that was showing as email subject

const testData = {
  organizationId: organizationId,
  accountId: 'test-account-123',
  scenarioName: scenarioName,
  contactEmail: 'john@example.com',
  contactName: 'John Smith',
  company: 'Example Property Management',
  emailSubject: scenarioName, // This is the bug - scenario name instead of processed subject
  emailHtmlBody: '<p>This is a test email body</p>',
  requestBody: {
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Smith',
    company: 'Example Property Management',
    companyName: 'Example Property Management',
    // Add test data that might be used in subject line processing
    listingResearch: 'Ocean View Villa, Sunset Beach House, Mountain Retreat Lodge'
  }
};

async function testWebhookSubjectFix() {
  try {
    console.log('Testing webhook subject fix...');
    console.log('Test data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3000/api/webhook-logs/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Test completed successfully!');
      console.log('Webhook log created with ID:', result.id);
      
      // Now fetch the created webhook log to verify the subject was processed correctly
      const fetchResponse = await fetch(`http://localhost:3000/api/webhook-logs/${result.id}`);
      if (fetchResponse.ok) {
        const logData = await fetchResponse.json();
        console.log('\nActual stored emailSubject:', logData.emailSubject);
        
        if (logData.emailSubject === scenarioName) {
          console.log('❌ Fix did not work - still showing scenario name');
        } else {
          console.log('✅ Fix worked - showing processed subject line!');
        }
      }
    } else {
      console.log('❌ Test failed with error:', result);
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
}

// Run the test
testWebhookSubjectFix();