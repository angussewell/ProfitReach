// Input data from previous node
const inputData = items[0].json;

// Extract and format the message data
const formattedMessage = {
  message_id: inputData.message_id,
  thread_id: inputData.thread_id,
  subject: inputData.subject,
  sender: inputData.sender,
  recipient_email: inputData.recipient_email,
  content: inputData.content,
  message_source: inputData.message_source
};

// Return a single object, not an array
return formattedMessage; 