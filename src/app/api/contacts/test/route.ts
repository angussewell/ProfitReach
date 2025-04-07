import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Extract the organization ID from the query string
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('orgId') || 'cm94eugk20000ha98cm67z8hn'; // Default to org with 987 contacts
    
    console.log(`[TEST API] Using organization ID: ${organizationId}`);
    
    // Count ALL contacts
    const totalContacts = await prisma.contacts.count();
    
    // Count contacts for this organization
    const orgContacts = await prisma.contacts.count({
      where: { organizationId }
    });
    
    console.log(`[TEST API] Total contacts in database: ${totalContacts}`);
    console.log(`[TEST API] Contacts for organization ${organizationId}: ${orgContacts}`);
    
    // Get ALL organization IDs and counts
    const allOrgs = await prisma.$queryRaw`
      SELECT "organizationId", COUNT(*) as count 
      FROM "Contacts" 
      GROUP BY "organizationId"
    `;
    
    // Get a sample of up to 5 contacts for this organization
    const contacts = await prisma.contacts.findMany({
      where: { organizationId },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        organizationId: true
      }
    });
    
    // Return the results
    return NextResponse.json({
      totalContactsInDatabase: totalContacts,
      contactsForThisOrganization: orgContacts,
      organizationId,
      allOrganizations: allOrgs,
      sampleContacts: contacts
    });
    
  } catch (error) {
    console.error('[TEST API] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
