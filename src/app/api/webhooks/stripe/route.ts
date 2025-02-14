import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { CREDITS_PER_PACK } from '@/lib/stripe';
import Stripe from 'stripe';

async function handleSubscriptionChange(subscription: Stripe.Subscription, isTestMode: boolean) {
  const organizationId = subscription.metadata.organizationId;

  if (!organizationId) {
    throw new Error('No organizationId in metadata');
  }

  await prisma.$transaction(async (tx) => {
    // Update subscription in database
    await tx.subscription.upsert({
      where: {
        stripeSubscriptionId: subscription.id,
      },
      create: {
        organizationId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        subscriptionItemId: subscription.items.data[0].id,
        priceId: subscription.items.data[0].price.id,
        quantity: subscription.items.data[0].quantity,
        isTestMode,
      },
      update: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        subscriptionItemId: subscription.items.data[0].id,
        priceId: subscription.items.data[0].price.id,
        quantity: subscription.items.data[0].quantity,
      },
    });

    // Update organization's billing plan based on subscription status
    const billingPlan = subscription.status === 'active' ? 'at_cost' : 'unlimited';
    await tx.organization.update({
      where: { id: organizationId },
      data: { 
        billingPlan,
        lastBillingSync: new Date(),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
      },
    });

    // Log billing event
    await tx.billingEvent.create({
      data: {
        id: `sub_${subscription.id}_${Date.now()}`,
        organizationId,
        type: 'subscription_update',
        status: subscription.status,
        description: `Subscription ${subscription.status}`,
        metadata: subscription as any,
        isTestMode,
      },
    });
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    return new NextResponse('No signature', { status: 400 });
  }

  // First verify with live mode webhook secret
  let event: Stripe.Event | null = null;
  let isTestMode = false;

  // Try live mode first
  try {
    const liveSecret = getStripeWebhookSecret(false);
    if (liveSecret) {
      const liveStripe = getStripeClient(false);
      event = liveStripe.webhooks.constructEvent(body, signature, liveSecret);
    }
  } catch (err) {
    console.log('Failed to verify with live webhook secret, trying test mode');
  }

  // If live mode failed, try test mode
  if (!event) {
    try {
      const testSecret = getStripeWebhookSecret(true);
      if (testSecret) {
        const testStripe = getStripeClient(true);
        event = testStripe.webhooks.constructEvent(body, signature, testSecret);
        isTestMode = true;
      }
    } catch (err) {
      console.error('Error verifying webhook signature:', err);
      return new NextResponse('Invalid signature', { status: 400 });
    }
  }

  if (!event) {
    console.error('Failed to verify webhook with either live or test secrets');
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const stripe = getStripeClient(isTestMode);

  console.log('Processing Stripe webhook:', {
    type: event.type,
    id: event.id,
    timestamp: new Date().toISOString(),
    isTestMode,
  });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
      case 'customer.subscription.paused':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, isTestMode);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment' && session.metadata?.type === 'credits') {
          const organizationId = session.metadata.organizationId;
          const creditsStr = session.metadata.credits;
          
          if (!organizationId) {
            console.error('Missing organizationId in checkout session:', session);
            return new NextResponse('Missing organizationId', { status: 400 });
          }

          const credits = parseInt(creditsStr);
          if (isNaN(credits) || credits <= 0) {
            console.error('Invalid credits value in checkout session:', { creditsStr, session });
            return new NextResponse('Invalid credits value', { status: 400 });
          }

          try {
            await prisma.$transaction(async (tx) => {
              await tx.organization.update({
                where: { id: organizationId },
                data: {
                  creditBalance: {
                    increment: credits,
                  },
                  lastBillingSync: new Date(),
                },
              });

              await tx.creditUsage.create({
                data: {
                  organizationId,
                  amount: credits,
                  description: `Credits purchased (Session ${session.id})`,
                },
              });

              const billingEventId = `cs_${session.id.slice(-8)}_${Date.now()}`;
              await tx.billingEvent.create({
                data: {
                  id: billingEventId,
                  organizationId,
                  type: 'credits_purchased',
                  status: 'success',
                  amount: session.amount_total || 0,
                  description: `Purchased ${credits.toLocaleString()} credits`,
                  metadata: session as any,
                  isTestMode,
                },
              });
            });

            console.log('Credits added from checkout:', {
              organizationId,
              credits,
              sessionId: session.id,
              isTestMode,
            });
          } catch (error) {
            console.error('Error processing credit purchase:', {
              error,
              organizationId,
              credits,
              sessionId: session.id,
            });
            return new NextResponse('Error processing credit purchase', { status: 500 });
          }
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) {
          console.log('No subscription ID found for invoice:', invoice.id);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const organizationId = subscription.metadata.organizationId;

        if (!organizationId) {
          throw new Error('No organizationId in metadata');
        }

        if (subscription.metadata.type === 'credits') {
          await prisma.$transaction(async (tx) => {
            await tx.organization.update({
              where: { id: organizationId },
              data: {
                creditBalance: {
                  increment: CREDITS_PER_PACK,
                },
                lastBillingSync: new Date(),
              },
            });

            await tx.creditUsage.create({
              data: {
                organizationId,
                amount: CREDITS_PER_PACK,
                description: `Credits purchased (Invoice ${invoice.id})`,
              },
            });

            await tx.billingEvent.create({
              data: {
                id: `inv_${invoice.id}_${Date.now()}`,
                organizationId,
                type: 'invoice_paid',
                status: 'success',
                amount: invoice.amount_paid,
                description: `Invoice paid for ${CREDITS_PER_PACK} credits`,
                metadata: invoice as any,
                isTestMode,
              },
            });
          });

          console.log('Credits added:', {
            organizationId,
            amount: CREDITS_PER_PACK,
            invoiceId: invoice.id,
            isTestMode,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (!subscriptionId) {
          console.log('No subscription ID found for failed invoice:', invoice.id);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const organizationId = subscription.metadata.organizationId;

        if (!organizationId) {
          throw new Error('No organizationId in metadata');
        }

        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: {
              stripeSubscriptionId: subscription.id,
            },
            data: {
              status: 'past_due',
            },
          });

          await tx.organization.update({
            where: { id: organizationId },
            data: {
              billingPlan: 'unlimited', // Revert to unlimited plan on payment failure
              lastBillingSync: new Date(),
            },
          });

          await tx.billingEvent.create({
            data: {
              id: `inv_fail_${invoice.id}_${Date.now()}`,
              organizationId,
              type: 'invoice_failed',
              status: 'failed',
              amount: invoice.amount_due,
              description: 'Payment failed',
              metadata: invoice as any,
              isTestMode,
            },
          });
        });

        console.error('Payment failed:', {
          organizationId,
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          isTestMode,
        });
        break;
      }

      default: {
        console.log('Unhandled event type:', event.type);
      }
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', {
      error: errorMessage,
      eventType: event.type,
      eventId: event.id,
      isTestMode,
    });

    // Log error to billing events
    try {
      await prisma.billingEvent.create({
        data: {
          id: `error_${event.id}_${Date.now()}`,
          organizationId: (event.data.object as any)?.metadata?.organizationId || 'unknown',
          type: 'webhook_error',
          status: 'error',
          description: errorMessage,
          metadata: {
            eventType: event.type,
            eventId: event.id,
            error: errorMessage,
            isTestMode,
          },
          isTestMode,
        },
      });
    } catch (logError) {
      console.error('Failed to log billing event error:', logError);
    }

    return new NextResponse('Webhook error', { status: 500 });
  }
} 