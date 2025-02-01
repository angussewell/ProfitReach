import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const session = await getServerSession(authOptions);
      console.log('Organization switch attempt:', { 
        userId: session?.user?.id,
        attempt: retries + 1 
      });

      if (!session?.user) {
        console.log('Unauthorized: No session user');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { organizationId } = body;

      if (!organizationId) {
        console.log('Bad request: No organization ID provided');
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
      }

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        console.log('Organization not found:', { organizationId });
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      // For regular users, verify they belong to the organization
      if (session.user.role !== 'admin') {
        const userOrg = await prisma.user.findFirst({
          where: {
            id: session.user.id,
            organizationId: organizationId
          }
        });

        if (!userOrg) {
          console.log('Forbidden: User does not belong to organization', {
            userId: session.user.id,
            organizationId
          });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // Update user's organization
      await prisma.user.update({
        where: { id: session.user.id },
        data: { organizationId }
      });

      // Get updated user data
      const updatedUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          organization: {
            select: { id: true, name: true }
          }
        }
      });

      console.log('Organization switch successful:', {
        userId: session.user.id,
        organizationId: updatedUser?.organization?.id,
        organizationName: updatedUser?.organization?.name,
        attempt: retries + 1
      });

      return NextResponse.json({
        organizationId: updatedUser?.organization?.id,
        organizationName: updatedUser?.organization?.name
      });
      
    } catch (error) {
      console.error('Error switching organization:', {
        error,
        attempt: retries + 1
      });

      // Check if it's a database error that we should retry
      if (error instanceof PrismaClientKnownRequestError) {
        // Retry on connection errors (P1001, P1002) or deadlocks (P2034)
        if (['P1001', 'P1002', 'P2034'].includes(error.code) && retries < MAX_RETRIES - 1) {
          console.log(`Retrying organization switch (attempt ${retries + 2}/${MAX_RETRIES})...`);
          await wait(RETRY_DELAY);
          retries++;
          continue;
        }
      }

      // If we've exhausted retries or it's not a retryable error
      return NextResponse.json({ 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, { status: 500 });
    }
  }

  // This should never be reached due to the return in the error handler
  return NextResponse.json({ error: 'Maximum retries exceeded' }, { status: 500 });
}