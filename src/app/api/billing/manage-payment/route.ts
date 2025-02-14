import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
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
    });

    if (!organization) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Create or get Stripe customer
    let customer;
    if (organization.stripeCustomerId) {
      customer = await stripe.customers.retrieve(organization.stripeCustomerId);
      if ((customer as any).deleted) {
        customer = await stripe.customers.create({
          name: organization.name,
          metadata: {
            organizationId: organization.id,
          },
        });
        await prisma.organization.update({
          where: { id: organization.id },
          data: { stripeCustomerId: customer.id },
        });
      }
    } else {
      customer = await stripe.customers.create({
        name: organization.name,
        metadata: {
          organizationId: organization.id,
        },
      });
      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create a setup-only checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/user-settings?setup=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/user-settings?setup=canceled`,
    });

    return NextResponse.redirect(checkoutSession.url!);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 