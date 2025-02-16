import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Force dynamic API route
export const dynamic = 'force-dynamic';

// Sample test data
const testEmailAccount = {
  status: 'CREATION_SUCCESS',
  account_id: 'test_email_account_id',
  name: '' // Will be filled with organizationId
};

const testEmailAccountDetails = {
  object: 'Account',
  id: 'test_email_account_id',
  name: 'Test Email Account',
  type: 'GMAIL',
  created_at: new Date().toISOString(),
  connection_params: {
    mail: {
      id: 'test_mail_id',
      username: 'test@example.com',
      email: 'test@example.com'
    }
  },
  sources: [
    {
      id: 'source_1',
      status: 'OK'
    }
  ]
};

const testSocialAccount = {
  status: 'CREATION_SUCCESS',
  account_id: 'test_social_account_id',
  name: '' // Will be filled with organizationId
};

const testSocialAccountDetails = {
  object: 'Account',
  id: 'test_social_account_id',
  name: 'Test Social Account',
  type: 'LINKEDIN',
  created_at: new Date().toISOString(),
  connection_params: {
    im: {
      id: 'test_im_id',
      username: 'testuser'
    }
  },
  sources: [
    {
      id: 'source_1',
      status: 'OK'
    }
  ]
};

// Test direct Prisma operations
async function testDirectPrismaOperations(organizationId: string) {
  console.log('🧪 Testing direct Prisma operations');

  try {
    // Test email account creation
    const emailResult = await prisma.emailAccount.create({
      data: {
        email: 'direct_test@example.com',
        name: 'Direct Test Email',
        organizationId,
        unipileAccountId: 'direct_test_email_id',
        isActive: true
      }
    });
    console.log('✅ Direct email account creation successful:', emailResult);

    // Clean up test data
    await prisma.emailAccount.delete({
      where: { id: emailResult.id }
    });
    console.log('🧹 Cleaned up test email account');

    return true;
  } catch (error) {
    console.error('❌ Direct Prisma operation failed:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    });
    return false;
  }
}

export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Test endpoint not available in production', { status: 403 });
  }

  console.log('🧪 Starting webhook test');

  try {
    const body = await req.json();
    const { type, organizationId } = body;

    if (!organizationId) {
      return new NextResponse('organizationId is required', { status: 400 });
    }

    console.log('🧪 Test parameters:', { type, organizationId });

    // Test direct Prisma operations first
    const prismaTest = await testDirectPrismaOperations(organizationId);
    if (!prismaTest) {
      return new NextResponse('Direct Prisma operations failed', { status: 500 });
    }

    // Prepare webhook URL
    const webhookUrl = new URL('/api/webhooks/unipile', req.url);
    console.log('🧪 Webhook URL:', webhookUrl.toString());

    // Test account based on type
    const testData = type === 'email' ? testEmailAccount : testSocialAccount;
    const testDetails = type === 'email' ? testEmailAccountDetails : testSocialAccountDetails;

    // Set organization ID
    testData.name = organizationId;

    // First request: webhook data
    console.log('🧪 Sending webhook data:', testData);
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const webhookResult = await webhookResponse.text();
    console.log('🧪 Webhook response:', {
      status: webhookResponse.status,
      result: webhookResult
    });

    // Mock the account details fetch
    global.fetch = async (url: string, options: any) => {
      if (url.includes('/accounts/')) {
        console.log('🧪 Mocking account details response');
        return {
          ok: true,
          json: async () => testDetails
        };
      }
      throw new Error('Unexpected fetch call');
    };

    return new NextResponse(JSON.stringify({
      success: true,
      webhookStatus: webhookResponse.status,
      webhookResult
    }));
  } catch (error) {
    console.error('❌ Test failed:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    });
    return new NextResponse('Test failed', { status: 500 });
  }
} 