-- Update webhook logs with scenario names from request bodies
UPDATE "WebhookLog"
SET "scenarioName" = TRIM(CAST("requestBody"->>'Current Scenario ' AS TEXT))
WHERE "scenarioName" = 'Unknown'
AND "requestBody"->>'Current Scenario ' IS NOT NULL
AND TRIM(CAST("requestBody"->>'Current Scenario ' AS TEXT)) != '';

-- Set status to error for logs that still have Unknown scenario name
UPDATE "WebhookLog"
SET "status" = 'error',
    "responseBody" = jsonb_set(
        COALESCE("responseBody", '{}'::jsonb),
        '{error}',
        '"Scenario name could not be determined from webhook data"'
    )
WHERE "scenarioName" = 'Unknown'; 