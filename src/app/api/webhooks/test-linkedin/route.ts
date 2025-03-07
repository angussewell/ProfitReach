import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Find a LinkedIn account
    const linkedInAccount = await prisma.socialAccount.findFirst({
      where: {
        organizationId,
        provider: 'LINKEDIN',
        isActive: true
      }
    });

    if (!linkedInAccount) {
      return NextResponse.json({ 
        error: 'No LinkedIn account found', 
        help: 'Please add a LinkedIn account in the Accounts section first' 
      }, { status: 404 });
    }

    // Generate a test LinkedIn message
    const testMessagePayload = {
      message_id: `test-linkedin-${Date.now()}`,
      thread_id: `test-thread-${Date.now()}`,
      organizationId: organizationId,
      message_source: 'LINKEDIN',
      social_account_id: linkedInAccount.unipileAccountId,
      sender: 'linkedin-test-user@example.com',
      content: 'This is a test LinkedIn message. It was generated by the test endpoint to demonstrate LinkedIn message handling in the Universal Inbox.',
      unipile_linkedin_id: `test-linkedin-id-${Date.now()}`
    };

    // Call the universal inbox webhook with this payload
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/universal-inbox-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessagePayload),
    });

    const webhookResult = await webhookResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test LinkedIn message created successfully',
      payload: testMessagePayload,
      webhookResult
    });
    
  } catch (error) {
    console.error('Error creating test LinkedIn message:', error);
    return NextResponse.json(
      { error: 'Failed to create test message' },
      { status: 500 }
    );
  }
} 