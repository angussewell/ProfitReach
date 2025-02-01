const VarReplacer = require('../utils/variableReplacer');

// Create a flat structure of key-value pairs
const testData = {
  "Outbound Rep Name": "John Smith",
  "Email Sender": "john@example.com",
  "Title": "Sales Manager",
  "customization_prompt": "Custom prompt here"
};

const template = `
Hello {Title},

This message is from {Email Sender}. Your rep is {Outbound Rep Name}.
Your customization is: {customization_prompt}
`;

async function test() {
  console.log('Original template:', template);
  console.log('\nTest data:', JSON.stringify(testData, null, 2));
  
  const result = await VarReplacer.replaceVariables(template, testData);
  console.log('\nResult:', result);
}

test().catch(console.error); 