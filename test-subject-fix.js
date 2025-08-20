/**
 * Test script to verify the webhook log email subject fix
 * This creates a new webhook log to test the fix implementation
 */

const organizationId = 'ae4addba-f910-496f-827e-fb6074d6ba05';
const scenarioName = 'Initial SOP Email 1';

const testData = {
  organizationId: organizationId,
  accountId: 'test-account-123',
  scenarioName: scenarioName,
  contactEmail: 'pedro@casiola.com',
  contactName: 'Pedro Rodriguez',
  company: 'Casiola Property Management',
  emailSubject: scenarioName, // This is the bug - scenario name instead of processed subject
  emailHtmlBody: '<p>Test email body</p>',
  requestBody: {
    email: 'pedro@casiola.com',
    firstName: 'Pedro',
    lastName: 'Rodriguez',
    company: 'Casiola Property Management',
    companyName: 'Casiola Property Management',
    // Add test data that might be used in subject line processing
    listingResearch: 'South Island Aruba Homes for Rent, Aruba Condo Rentals, Beachfront Villa Collection'
  }
};

async function testWebhookSubjectFix() {
  try {
    console.log('🧪 Testing webhook subject fix...');
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:3000/api/webhook-logs/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Webhook log created successfully!');
    console.log('📝 Webhook log ID:', result.id);
    console.log('📧 Email Subject stored:', result.emailSubject);
    
    // Check if the fix worked
    if (result.emailSubject === scenarioName) {
      console.log('❌ Fix did not work - still showing scenario name');
      console.log('💡 Expected: A processed subject line with listing names');
      console.log('💡 Got: The scenario name unchanged');
    } else {
      console.log('✅ Fix worked - showing processed subject line!');
      console.log('🎯 Original scenario name:', scenarioName);
      console.log('🎯 Processed subject line:', result.emailSubject);
    }

    return result;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Run the test
testWebhookSubjectFix()
  .then(result => {
    if (result) {
      console.log('\n🎉 Test completed! Check the webhook logs page to see the new entry.');
    }
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });