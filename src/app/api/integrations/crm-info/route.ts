import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Get organizationId from the query string
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    console.log('Fetching CRM info for organization:', organizationId);
    
    // Fetch CRM info using raw SQL
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "CrmInfo"
        WHERE "organizationId" = ${organizationId}::text
      `;
      
      // Handle case where result is an array
      const crmInfo = Array.isArray(result) ? result[0] : result;

      if (!crmInfo) {
        return NextResponse.json({ error: 'No CRM info found for this organization' }, { status: 404 });
      }

      return NextResponse.json(crmInfo);
    } catch (sqlError) {
      console.error('SQL Error during fetch:', sqlError);
      throw sqlError;
    }
  } catch (error) {
    console.error('Error in GET /api/integrations/crm-info:', error);
    // Add more detailed error information to help debug
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 