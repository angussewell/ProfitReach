import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getStripeClient } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        stripeTestCustomerId: true
      }
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Determine if we're in test mode based on URL params
    const url = new URL(req.url);
    const isTestMode = url.searchParams.get('mode') === 'test';
    const stripe = getStripeClient(isTestMode);

    // Get the appropriate customer ID based on mode
    const stripeCustomerId = isTestMode ? organization.stripeTestCustomerId : organization.stripeCustomerId;

    // Create or get Stripe customer
    let customer;
    if (stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(stripeCustomerId);
        if ((customer as any).deleted) {
          throw new Error('Customer deleted');
        }
      } catch (error) {
        // If customer retrieval fails or customer was deleted, create new one
        customer = await stripe.customers.create({
          name: organization.name,
          metadata: {
            organizationId: organization.id,
            isTestMode: isTestMode.toString()
          },
        });
        await prisma.organization.update({
          where: { id: organization.id },
          data: isTestMode 
            ? { stripeTestCustomerId: customer.id }
            : { stripeCustomerId: customer.id },
        });
      }
    } else {
      // Create new customer if none exists
      customer = await stripe.customers.create({
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          isTestMode: isTestMode.toString()
        },
      });
      await prisma.organization.update({
        where: { id: organization.id },
        data: isTestMode 
          ? { stripeTestCustomerId: customer.id }
          : { stripeCustomerId: customer.id },
      });
    }

    // Create a setup-only checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/user-settings?setup=success&mode=${isTestMode ? 'test' : 'live'}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/user-settings?setup=canceled&mode=${isTestMode ? 'test' : 'live'}`,
      metadata: {
        isTestMode: isTestMode.toString()
      }
    });

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return NextResponse.redirect(checkoutSession.url);
  } catch (error) {
    console.error('Error in manage payment:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      organizationId: session.user.organizationId,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { 
        error: 'Failed to manage payment method',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 