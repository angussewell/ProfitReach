

Info about products in Stripe:

Scenario runs pricing ($30 per unit) 

Price ID: price_1QsQzFKvKSz0ruymG7xxbw83

Product ID: prod_RlyxRnwU8LIYVS



Attached Account Subscriptions ($9 per unit)

Price ID: price_1QsRKKKvKSz0ruymMGfFtOiB

Product ID: prod_RlzIHdmT2hwB6s





Configure Subscription with Thresholds:

To ensure automatic recharging when credits run out:

1. When creating a subscription via the API or Dashboard:
   - Attach the product with the metered price you created earlier.
   - Set a `billing_thresholds` parameter on the subscription item:
     ```json
     {
       "subscription_items": [
         {
           "price": "price_id", // Replace with your price ID
           "billing_thresholds": {
             "usage_gte": 5000 // Trigger an invoice when 5,000 credits are consumed
           }
         }
       ]
     }
     ```
   - This ensures that once 5,000 credits are consumed, Stripe automatically generates an invoice and charges $30 to replenish credits.

---

Report Usage from Your Application:

Each time a user consumes credits (e.g., runs a scenario), report this usage to Stripe using the [Usage Records API](https://stripe.com/docs/api/usage_records). Here’s an example:

```javascript
const stripe = require('stripe')('your-secret-key');

await stripe.subscriptionItems.createUsageRecord(
  'subscription_item_id', // Replace with your subscription item ID
  {
    quantity: 1, // Number of credits consumed
    timestamp: Math.floor(Date.now() / 1000), // Current timestamp
    action: 'increment',
  }
);
```

Your application should call this API every time a user consumes credits. Stripe will aggregate these usage events and charge users when they hit the threshold (5,000 credits).

---

Handle Webhooks:

Stripe will notify your system of events like invoices being paid or payment failures through webhooks. Set up webhook endpoints in your application to handle these events:

- Listen for `invoice.paid` events:
  - When an invoice is paid (e.g., $30 for another 5,000 credits), update the user's credit balance in your application.
- Listen for `invoice.payment_failed` events:
  - Notify users or pause access if payment fails.

Example webhook handling in Node.js:

```javascript
app.post('/webhook', async (req, res) => {
  const event = req.body;

  switch (event.type) {
    case 'invoice.paid':
      // Add 5,000 credits to user's account
      break;
    case 'invoice.payment_failed':
      // Notify user of payment failure
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.sendStatus(200);
});
```

---

## Summary of Key Configuration Choices

| Configuration Step                  | Value/Choice                   |
|-------------------------------------|--------------------------------|
| Pricing Model                       | Usage-based                   |
| Per Unit / Package / Tier           | Per Unit                      |
| Price Per Unit                      | $0.006                        |
| Meter Usage Charge Method           | Sum                           |
| Billing Period                      | Monthly                       |
| Meter Name                          | `scenario_run_credits`        |
| Event Name                          | `scenario_run_usage`          |
| Aggregation Method                  | Sum                           |
| Billing Thresholds                  | Trigger at 5,000 credits      |

By following these steps, you’ll have a fully automated system where users are charged $30 whenever their credit balance runs out. This minimizes manual intervention and keeps everything streamlined within Stripe’s ecosystem!




Handle Quantity Dynamically in Your Application**:
   - When creating or updating a subscription, set the `quantity` field equal to the number of accounts the user has attached.
   - Example: If a user has 3 accounts, set `quantity: 3`. Stripe will automatically calculate the total as $$ 3 \times 9 = 27 $$.

### Example API Call to Create a Subscription:
```javascript
const stripe = require('stripe')('your-secret-key');

const subscription = await stripe.subscriptions.create({
  customer: 'customer_id', // Replace with your customer's ID
  items: [
    {
      price: 'price_id', // Replace with your flat-rate price ID for $9
      quantity: numberOfAccounts, // Dynamically set based on attached accounts
    },
  ],
});
```

### Example API Call to Update Subscription:
```javascript
await stripe.subscriptionItems.update(
  'subscription_item_id', // Replace with the subscription item ID
  {
    quantity: updatedNumberOfAccounts, // New number of attached accounts
  }
);
```

Stripe will automatically prorate charges if users add or remove accounts mid-billing cycle unless you disable proration.

---

## **Option 2: Use Tiered Pricing (Alternative)**

If you want to avoid dynamically managing quantities in your application, you can use **tiered pricing**. This allows you to define pricing tiers based on ranges of accounts (e.g., $9 for 1 account, $18 for 2 accounts, etc.). However, this approach is less flexible because you’d need to predefine all possible tiers.

### **Steps to Configure Tiered Pricing**

1. **Create a Product in Stripe**:
   - Go to **Products** → **Add Product**.
   - Name the product (e.g., "Attached Accounts Subscription").
   - Add an optional description (e.g., "$9 per account per month").
   - For **Pricing model**, select **Recurring**.
   - Set the billing period to **Monthly**.

2. **Set Up Tiered Pricing**:
   - Under "Pricing," select **Tiered pricing**.
   - Define tiers as follows:
     | First Unit | Last Unit | Per Unit | Flat Fee |
     |------------|-----------|----------|----------|
     | 1          | 1         | $9       | $0       |
     | 2          | 2         | $18      | $0       |
     | ...        | ...       | ...      | ...      |

   - Leave the last tier open-ended if you want to allow unlimited accounts.

3. **Limitations of Tiered Pricing**:
   - You must define every possible tier up to a reasonable limit (e.g., up to 10 or 20 accounts).
   - Adding or removing accounts mid-cycle may not prorate accurately unless handled carefully.

---

## **Why Flat-Rate Pricing Is Better**

- It’s simpler and more scalable since you don’t need to predefine tiers.
- Your application can dynamically manage quantities, which is more flexible for users with varying numbers of accounts.
- Stripe handles all calculations automatically based on the quantity you pass in API calls.

---

## Summary

| Approach            | Pros                                                                                   | Cons                                                                                     |
|---------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Flat-Rate Pricing    | Simple setup; scalable; dynamic quantity management; prorates automatically            | Requires managing `quantity` in your application                                         |
| Tiered Pricing       | No need for dynamic quantity management                                               | Requires defining all possible tiers; less flexible; harder to scale                    |

For your use case, I recommend using **flat-rate pricing** with dynamic quantities. This avoids errors like "price unit must be greater than 1" and provides flexibility as users add or remove accounts.




Based on the search results and current Stripe documentation, here's a comprehensive breakdown of implementing both subscription types in your Next.js application:

## Usage-Based Billing (Scenario Runs - $30/5,000 runs)

### Stripe Configuration
```javascript
// 1. Create a meter for tracking scenario runs
const meter = await stripe.meters.create({
  display_name: 'Scenario Runs',
  meter_name: 'scenario_runs',
  event_name: 'scenario_run_usage',
  aggregation_method: 'sum'
});

// 2. Create a usage-based price
const price = await stripe.prices.create({
  unit_amount: 3000, // $30.00
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered'
  },
  billing_scheme: 'per_unit',
  product: 'prod_xyz', // Your product ID
  meter: meter.id
});
```

### Usage Reporting
```javascript
// Report usage when a scenario is run
await stripe.subscriptionItems.createUsageRecord(
  'si_xyz', // Subscription item ID
  {
    quantity: 1, // Increment by 1 run
    timestamp: Math.floor(Date.now() / 1000),
    action: 'increment'
  }
);
```

## Per-Unit Subscription (Accounts - $9/account)

### Stripe Configuration
```javascript
// Create a recurring price for accounts
const price = await stripe.prices.create({
  unit_amount: 900, // $9.00
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'licensed'
  },
  product: 'prod_abc' // Your product ID
});
```

### Subscription Management
```javascript
// Create/update subscription when accounts change
await stripe.subscriptions.create({
  customer: 'cus_xyz',
  items: [{
    price: 'price_xyz',
    quantity: numberOfAccounts // Dynamic based on accounts
  }]
});
```

## Next.js Implementation

### API Routes Setup
```typescript
// pages/api/stripe/create-subscription.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { customerId, accountCount } = req.body;
  
  try {
    // Create both subscriptions
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: 'price_xyz', // Account subscription price ID
          quantity: accountCount
        },
        {
          price: 'price_abc' // Scenario runs price ID
        }
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    });
    
    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Webhook Handler
```typescript
// pages/api/stripe/webhook.ts
export default async function handler(req, res) {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'customer.subscription.updated':
      // Handle subscription updates
      break;
    case 'invoice.paid':
      // Handle successful payments
      break;
    case 'invoice.payment_failed':
      // Handle failed payments
      break;
  }
  
  res.json({ received: true });
}
```

## Important Webhook Events to Monitor

| Event Type | Purpose |
|------------|---------|
| `customer.subscription.created` | Initial subscription setup |
| `customer.subscription.updated` | Account quantity changes |
| `invoice.paid` | Successful payment processing |
| `invoice.payment_failed` | Failed payment handling |
| `usage_record.created` | Scenario run tracking |

## Key Implementation Notes

1. **Usage Tracking**: Implement a counter in your application to track scenario runs and report them to Stripe.

2. **Account Management**: Update subscription quantity whenever accounts are added/removed.

3. **Billing Cycles**: Both subscriptions can be on the same billing cycle for simplicity.

4. **Error Handling**: Implement robust error handling for failed payments and usage reporting.

5. **Webhooks**: Set up proper webhook handling to keep your application state in sync with Stripe.

This implementation provides a foundation for both subscription types while maintaining flexibility for future changes. The usage-based billing handles scenario runs automatically, while the per-unit subscription manages account access dynamically.

