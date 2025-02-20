# Webhook Integration Guide

Each organization in Profit Reach has a unique webhook URL that can be used to receive contact data. This URL can be found in the organization's settings page.

## Webhook URL Format
```
https://app.messagelm.com/api/webhooks/[webhook-url]
```

## Request Format
- Method: POST
- Content-Type: application/json

### Required Fields
None - all fields are optional to maintain maximum flexibility

### Common Fields
```json
{
  "accountId": "string",
  "scenarioName": "string",
  "contactEmail": "string (email)",
  "contactName": "string",
  "company": "string"
}
```

### Additional Fields
The webhook endpoint accepts any additional fields in the JSON payload. These will be stored in the webhook log for future reference.

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "webhookLogId": "string"
}
```

### Error Responses

#### Invalid Webhook URL (404)
```json
{
  "error": "Invalid webhook URL"
}
```

#### Invalid Data Format (400)
```json
{
  "error": "Invalid webhook data",
  "details": [
    // Validation error details
  ]
}
```

#### Server Error (500)
```json
{
  "error": "Failed to process webhook",
  "details": "Error message"
}
```

## Testing
You can test your webhook integration using curl:

```bash
curl -X POST \
  https://app.messagelm.com/api/webhooks/YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "accountId": "test-account",
    "scenarioName": "test-scenario",
    "contactEmail": "test@example.com",
    "contactName": "Test Contact",
    "company": "Test Company",
    "customField": "This is a custom field"
  }'
```

## Webhook Logs
All webhook requests are logged and can be viewed in the Webhook Logs section of the application. Each log entry includes:
- Request data
- Response status
- Timestamp
- Organization information
- Scenario information (if provided)

## Best Practices
1. Store your webhook URL securely
2. Include meaningful data in the scenarioName field to help with tracking
3. Monitor webhook logs for any failures
4. Use proper error handling in your integration
5. Consider implementing retry logic for failed webhook deliveries 