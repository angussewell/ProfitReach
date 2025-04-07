import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[DEBUG API] Querying ALL contacts with NO filters');
    
    // Get total count of ALL contacts in the system
    const totalCount = await prisma.contacts.count();
    console.log(`[DEBUG API] Total contacts in database: ${totalCount}`);
    
    // Get a sample of the first 20 contacts
    const contacts = await prisma.contacts.findMany({
      take: 20,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        organizationId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`[DEBUG API] Retrieved ${contacts.length} contacts`);
    console.log(`[DEBUG API] Organization IDs found:`, 
      [...new Set(contacts.map(c => c.organizationId))]);
    
    // Get counts by organizationId
    const orgCounts = await prisma.$queryRaw`
      SELECT "organizationId", COUNT(*) as count 
      FROM "Contacts" 
      GROUP BY "organizationId"
    `;
    
    return NextResponse.json({
      totalCount,
      contacts,
      organizationCounts: orgCounts
    });
  } catch (error) {
    console.error('[DEBUG API] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
