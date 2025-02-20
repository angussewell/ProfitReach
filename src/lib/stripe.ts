import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

if (!process.env.STRIPE_TEST_SECRET_KEY) {
  throw new Error('Missing STRIPE_TEST_SECRET_KEY');
}

// Initialize both live and test clients
export const liveStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

export const testStripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

// Function to get the appropriate client
export function getStripeClient(isTestMode: boolean) {
  return isTestMode ? testStripe : liveStripe;
}

// Function to get the appropriate webhook secret
export function getStripeWebhookSecret(isTestMode: boolean) {
  return isTestMode 
    ? process.env.STRIPE_TEST_WEBHOOK_SECRET 
    : process.env.STRIPE_WEBHOOK_SECRET;
}

// Function to get the appropriate price ID
export function getStripePriceId(isTestMode: boolean, type: 'credits' | 'account') {
  if (type === 'credits') {
    return isTestMode 
      ? process.env.STRIPE_TEST_CREDITS_PRICE_ID 
      : process.env.STRIPE_CREDITS_PRICE_ID;
  } else {
    return isTestMode 
      ? process.env.STRIPE_TEST_ACCOUNT_PRICE_ID 
      : process.env.STRIPE_ACCOUNT_PRICE_ID;
  }
}

export const CREDITS_PER_PACK = 5000;
export const COST_PER_PACK = 5000; // $50.00 in cents
export const COST_PER_ACCOUNT = 900; // $9.00 in cents

export async function createOrUpdateCustomer(organizationId: string, isTestMode: boolean = false) {
  const stripe = getStripeClient(isTestMode);
  
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const stripeCustomerId = isTestMode ? organization.stripeTestCustomerId : organization.stripeCustomerId;

  if (stripeCustomerId) {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!customer.deleted) {
      return customer;
    }
  }

  const customer = await stripe.customers.create({
    name: organization.name,
    metadata: {
      organizationId: organization.id,
      isTestMode: isTestMode.toString(),
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: isTestMode 
      ? { stripeTestCustomerId: customer.id }
      : { stripeCustomerId: customer.id },
  });

  return customer;
}

export async function createCreditsSubscription(organizationId: string) {
  const customer = await createOrUpdateCustomer(organizationId);

  // First, check if there's an existing subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'active',
    },
  });

  if (existingSubscription) {
    const stripeClient = getStripeClient(false);
    const stripeSubscription = await stripeClient.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
    if (stripeSubscription.status === 'active') {
      return stripeSubscription;
    }
  }

  // Create a new subscription with proper billing thresholds
  const stripeClient = getStripeClient(false);
  const subscription = await stripeClient.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: process.env.STRIPE_CREDITS_PRICE_ID,
        billing_thresholds: {
          usage_gte: CREDITS_PER_PACK,
        },
      },
    ],
    payment_behavior: 'default_incomplete',
    automatic_tax: { enabled: true },
    collection_method: 'charge_automatically',
    metadata: {
      organizationId,
      type: 'credits',
    },
  });

  const subscriptionItem = subscription.items.data[0];

  await prisma.$transaction(async (tx) => {
    // Create subscription record
    await tx.subscription.create({
      data: {
        organizationId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        subscriptionItemId: subscriptionItem.id,
        priceId: subscriptionItem.price.id,
        quantity: subscriptionItem.quantity || 1,
      },
    });

    // Update organization
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        billingPlan: 'at_cost',
        creditBalance: CREDITS_PER_PACK,
        lastBillingSync: new Date(),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
      },
    });

    // Log initial credit usage
    await tx.creditUsage.create({
      data: {
        organizationId,
        amount: CREDITS_PER_PACK,
        description: 'Initial credits from subscription',
      },
    });

    // Log billing event
    await tx.billingEvent.create({
      data: {
        id: `sub_create_${subscription.id}_${Date.now()}`,
        organizationId,
        type: 'subscription_created',
        status: subscription.status,
        description: 'Initial subscription created',
        metadata: subscription as any,
      },
    });
  });

  // Report initial usage
  await stripeClient.subscriptionItems.createUsageRecord(
    subscriptionItem.id,
    {
      quantity: 0,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'set',
    }
  );

  return subscription;
}

export async function createAccountSubscription(
  organizationId: string,
  accountType: string,
  accountId: string
) {
  const customer = await createOrUpdateCustomer(organizationId);
  const stripeClient = getStripeClient(false);

  const subscription = await stripeClient.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: process.env.STRIPE_ACCOUNT_PRICE_ID,
        quantity: 1,
      },
    ],
    metadata: {
      organizationId,
      type: 'account',
      accountType,
      accountId,
    },
  });

  const subscriptionItem = subscription.items.data[0];

  await prisma.connectedAccountBilling.create({
    data: {
      organizationId,
      accountType,
      accountId,
      stripeSubscriptionItemId: subscriptionItem.id,
    },
  });

  return subscription;
}

export async function updateCreditBalance(organizationId: string, amount: number, description?: string, webhookLogId?: string) {
  return await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const newBalance = organization.creditBalance + amount;

    if (newBalance < 0) {
      throw new Error('Insufficient credits');
    }

    await tx.organization.update({
      where: { id: organizationId },
      data: { creditBalance: newBalance },
    });

    await tx.creditUsage.create({
      data: {
        organizationId,
        amount,
        description,
        webhookLogId,
      },
    });

    return newBalance;
  });
}

export async function getOrganizationBillingInfo(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscriptions: true,
      connectedAccounts: true,
      creditUsage: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      emailAccounts: {
        where: { isActive: true },
        select: { id: true }
      },
      socialAccounts: {
        where: { isActive: true },
        select: { id: true }
      }
    },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const activeAccountsCount = organization.emailAccounts.length + organization.socialAccounts.length;

  return {
    billingPlan: organization.billingPlan,
    creditBalance: organization.creditBalance,
    subscriptions: organization.subscriptions,
    connectedAccounts: organization.connectedAccounts,
    recentUsage: organization.creditUsage,
    activeAccountsCount
  };
}

// Add new function to report usage
export async function reportScenarioUsage(organizationId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: 'active',
    },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const stripeClient = getStripeClient(false);
  const stripeSubscription = await stripeClient.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const subscriptionItem = stripeSubscription.items.data[0];

  await stripeClient.subscriptionItems.createUsageRecord(
    subscriptionItem.id,
    {
      quantity: 1,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    }
  );
}

export async function hasValidPaymentMethod(organizationId: string, isTestMode: boolean = false): Promise<boolean> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      stripeCustomerId: true,
      stripeTestCustomerId: true,
      creditBalance: true
    }
  });

  if (!organization) {
    console.log('Organization not found:', organizationId);
    return false;
  }

  // If they have credits, always return true
  if (organization.creditBalance > 0) {
    console.log('Organization has credits, allowing operation:', {
      organizationId,
      creditBalance: organization.creditBalance
    });
    return true;
  }

  // Only check payment method if they have no credits
  const customerId = isTestMode ? organization.stripeTestCustomerId : organization.stripeCustomerId;
  
  if (!customerId) {
    console.log('No credits and no Stripe customer ID found:', {
      organizationId,
      isTestMode
    });
    return false;
  }

  try {
    const stripeClient = getStripeClient(isTestMode);
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const hasPaymentMethod = paymentMethods.data.length > 0;
    console.log('No credits, checking payment method:', {
      organizationId,
      hasPaymentMethod,
      methodCount: paymentMethods.data.length
    });

    return hasPaymentMethod;
  } catch (error) {
    console.error('Error checking payment method:', {
      error,
      organizationId,
      customerId,
      isTestMode
    });
    return false;
  }
}

export async function updateAccountSubscriptionQuantity(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      emailAccounts: {
        where: { isActive: true },
        select: { id: true }
      },
      socialAccounts: {
        where: { isActive: true },
        select: { id: true }
      },
      subscriptions: {
        where: {
          status: 'active',
          priceId: process.env.STRIPE_ACCOUNT_PRICE_ID
        }
      }
    }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const activeAccountsCount = organization.emailAccounts.length + organization.socialAccounts.length;
  
  // If there's an active subscription, update its quantity
  const subscription = organization.subscriptions[0];
  if (subscription) {
    const stripeClient = getStripeClient(false);
    await stripeClient.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: subscription.subscriptionItemId!,
        quantity: activeAccountsCount || 1 // Minimum of 1 to avoid Stripe errors
      }]
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { quantity: activeAccountsCount || 1 }
    });
  }

  return activeAccountsCount;
} 