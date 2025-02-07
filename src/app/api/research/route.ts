import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // TODO: Integrate with Perplexity API
    // For now, return a mock response
    const result = {
      id: Math.random().toString(36).substring(7),
      query,
      result: `Mock research result for: ${query}\n\nThis is a placeholder response. The actual research functionality will be implemented using the Perplexity API.`,
      createdAt: new Date().toISOString()
    };

    // Store the research result
    await prisma.researchResult.create({
      data: {
        id: result.id,
        query: result.query,
        result: result.result,
        organizationId: session.user.organizationId
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { error: 'Failed to perform research' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await prisma.researchResult.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      results,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching research results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research results' },
      { status: 500 }
    );
  }
} 