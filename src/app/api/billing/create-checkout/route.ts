import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripeClient } from '@/lib/stripe';
import { z } from 'zod';

// Validate request body
const requestSchema = z.object({
  credits: z.number().min(1000),
  price: z.number().min(1),
  isTestMode: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { credits, price, isTestMode } = requestSchema.parse(body);

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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const stripe = getStripeClient(isTestMode);
    const customerId = isTestMode ? organization.stripeTestCustomerId : organization.stripeCustomerId;

    let customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
      if ((customer as any).deleted) {
        customer = null;
      }
    }

    if (!customer) {
      customer = await stripe.customers.create({
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          isTestMode: isTestMode.toString()
        }
      });

      // Update organization with new customer ID
      await prisma.organization.update({
        where: { id: organization.id },
        data: isTestMode 
          ? { stripeTestCustomerId: customer.id }
          : { stripeCustomerId: customer.id }
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${credits.toLocaleString()} Credits`,
            description: 'Credits for scenario runs'
          },
          unit_amount: price * 100, // Convert to cents
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        organizationId: organization.id,
        type: 'credits',
        credits: credits.toString(),
        price: price.toString(),
        isTestMode: isTestMode.toString()
      }
    });

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 