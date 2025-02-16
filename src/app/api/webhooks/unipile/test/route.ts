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

// Test endpoint to verify webhook functionality
export async function GET(req: Request) {
  console.log('🧪 Test endpoint accessed:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({
    status: 'ok',
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString()
  });
}

// Test endpoint to simulate a webhook
export async function POST(req: Request) {
  console.log('🧪 Test webhook received:', {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  let body;
  try {
    body = await req.json();
    console.log('🧪 Test webhook body:', body);
  } catch (error) {
    console.error('🧪 Error parsing test webhook body:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Invalid JSON body'
    }, { status: 400 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Test webhook received successfully',
    receivedBody: body,
    timestamp: new Date().toISOString()
  });
} 