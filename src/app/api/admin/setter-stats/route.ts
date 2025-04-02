import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const statsQuerySchema = z.object({
  startDate: z.string()
    .refine(val => {
      try {
        // Check if the string can be parsed as a valid date
        return !isNaN(new Date(val).getTime());
      } catch (e) {
        return false;
      }
    }, { message: "Invalid start date format - must be parsable as a Date" }),
  endDate: z.string()
    .refine(val => {
      try {
        // Check if the string can be parsed as a valid date
        return !isNaN(new Date(val).getTime());
      } catch (e) {
        return false;
      }
    }, { message: "Invalid end date format - must be parsable as a Date" }),
  bypass_date_filter: z.string().optional(),
});

// API response type with metadata
interface StatsResponse {
  data: Array<{ userEmail: string; replyCount: number }>; // Ensure replyCount is number
  metadata: {
    dateFiltered: boolean;
    organizationId: string;
    startDate?: string;
    endDate?: string;
    totalUsers: number;
    totalReplies: number; // Ensure totalReplies is number
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateRaw = searchParams.get('startDate');
    const endDateRaw = searchParams.get('endDate');
    const bypassDateFilterRaw = searchParams.get('bypass_date_filter');
    
    console.log('[API /setter-stats] Raw query parameters:', { startDateRaw, endDateRaw, bypassDateFilterRaw });
    
    const queryParams = {
      startDate: startDateRaw || '',
      endDate: endDateRaw || '',
      bypass_date_filter: bypassDateFilterRaw || undefined,
    };

    const bypassDateFilter = queryParams.bypass_date_filter === 'true';
    console.log(`[API /setter-stats] Bypass date filtering: ${bypassDateFilter}`);

    const validationResult = statsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      console.error('[API /setter-stats] Validation failed:', JSON.stringify(validationResult.error, null, 2));
      return NextResponse.json({ error: 'Invalid query parameters', details: validationResult.error?.errors }, { status: 400 });
    }
    
    if (!startDateRaw || !endDateRaw) {
      console.error('[API /setter-stats] Missing required parameters', { startDateRaw, endDateRaw });
      return NextResponse.json({ error: 'Missing required date parameters', details: { missing: !startDateRaw ? 'startDate' : 'endDate' } }, { status: 400 });
    }

    const { startDate, endDate } = validationResult.data;
    const organizationId = session.user.organizationId;
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    console.log('[API /setter-stats] Parsed query parameters:', { organizationId, startDateIso: startDate, endDateIso: endDate, parsedStartDate, parsedEndDate, bypassDateFilter });

    try {
      // First, verify if the table exists
      const tableCheck = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public'
           AND table_name = 'ReplyLog'
         );`
      );
      
      console.log('[API /setter-stats] Table check result:', tableCheck);
      
      // If table doesn't exist, return empty array instead of error
      const tableExists = Array.isArray(tableCheck) && tableCheck.length > 0 && tableCheck[0].exists === true;
      if (!tableExists) {
        console.log('[API /setter-stats] ReplyLog table does not exist yet, returning empty results');
        const emptyResponse: StatsResponse = {
          data: [],
          metadata: { dateFiltered: false, organizationId, totalUsers: 0, totalReplies: 0 }
        };
        return NextResponse.json(emptyResponse);
      }

      // First check table columns to determine date column name
      console.log('[API /setter-stats] Checking table columns');
      const columnCheck = await prisma.$queryRawUnsafe(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'ReplyLog';`
      );
      
      console.log('[API /setter-stats] Column check result:', columnCheck);

      // Try to find the date/timestamp column - common names
      const dateColumns = ['createdAt', 'created_at', 'timestamp', 'date', 'replyDate', 'reply_date', 'created', 'sent_at', 'replied_at'];
      let dateColumnName = null; // No default assumption - we'll determine this based on what's in the database
      let foundDateColumn = false;
      
      if (Array.isArray(columnCheck)) {
        console.log('[API /setter-stats] Available columns:', columnCheck.map(col => col.column_name).join(', '));
        
        // First try to find case-sensitive exact matches
        for (const col of columnCheck) {
          const colName = col.column_name;
          if (dateColumns.includes(colName)) {
            dateColumnName = colName;
            foundDateColumn = true;
            console.log(`[API /setter-stats] Found date column: ${dateColumnName}`);
            break;
          }
        }
        
        // If no exact match, try case-insensitive matching
        if (!foundDateColumn) {
          for (const col of columnCheck) {
            const colName = col.column_name.toLowerCase();
            const matchedCol = dateColumns.find(dc => dc.toLowerCase() === colName);
            if (matchedCol) {
              dateColumnName = col.column_name; // Use the actual case from the database
              foundDateColumn = true;
              console.log(`[API /setter-stats] Found date column (case-insensitive match): ${dateColumnName}`);
              break;
            }
          }
        }
        
        // If still no match, try to find any column with 'date' or 'time' in the name
        if (!foundDateColumn) {
          for (const col of columnCheck) {
            const colName = col.column_name.toLowerCase();
            if (colName.includes('date') || colName.includes('time') || colName.includes('created') || colName.includes('at')) {
              dateColumnName = col.column_name;
              foundDateColumn = true;
              console.log(`[API /setter-stats] Found potential date column by name pattern: ${dateColumnName}`);
              break;
            }
          }
        }
      }

      // Execute query with or without date filtering
      let statsRaw: any;
      let dateFiltered = !bypassDateFilter && foundDateColumn;
      
      // Double-check that we have a valid date column name if we want to filter by date
      if (dateFiltered && !dateColumnName) {
        console.log('[API /setter-stats] Warning: Date filtering requested but no valid date column found. Falling back to no date filtering.');
        dateFiltered = false;
      }

      if (!dateFiltered) {
        console.log('[API /setter-stats] Executing query without date filters (ALL ORGS)...');
        statsRaw = await prisma.$queryRawUnsafe(
          `SELECT "userEmail", COUNT(*) as "replyCount"
           FROM "ReplyLog"
           GROUP BY "userEmail"
           ORDER BY "replyCount" DESC`
        );
      } else {
        console.log('[API /setter-stats] Executing query with date filters using column: (ALL ORGS)', dateColumnName);
        statsRaw = await prisma.$queryRawUnsafe(
          `SELECT "userEmail", COUNT(*) as "replyCount"
           FROM "ReplyLog"
           WHERE "${dateColumnName}" >= $1
           AND "${dateColumnName}" <= $2
           GROUP BY "userEmail"
           ORDER BY "replyCount" DESC`,
          parsedStartDate,
          parsedEndDate
        );
        
        // Fallback if no results with date filtering
        if (Array.isArray(statsRaw) && statsRaw.length === 0) {
          console.log('[API /setter-stats] No results with date filtering, retrying without date filters (ALL ORGS)...');
          dateFiltered = false;
          statsRaw = await prisma.$queryRawUnsafe(
            `SELECT "userEmail", COUNT(*) as "replyCount"
             FROM "ReplyLog"
             GROUP BY "userEmail"
             ORDER BY "replyCount" DESC`
          );
        }
      }

      console.log(`[API /setter-stats] Found ${Array.isArray(statsRaw) ? statsRaw.length : 0} raw user entries (ALL ORGS).`);
      
      // *** Apply BigInt conversion to the raw results ***
      let processedStats: Array<{ userEmail: string; replyCount: number }> = [];
      let totalReplies = 0;

      if (Array.isArray(statsRaw)) {
          processedStats = statsRaw.map(stat => {
              // Explicitly convert replyCount (which is BigInt) to Number
              const count = stat.replyCount !== null && stat.replyCount !== undefined 
                            ? Number(stat.replyCount) 
                            : 0;
              // Ensure count is not NaN
              const numericCount = isNaN(count) ? 0 : count; 
              return {
                  userEmail: stat.userEmail,
                  replyCount: numericCount
              };
          });
          
          // Calculate total replies from the *processed* data
          totalReplies = processedStats.reduce((sum, stat) => sum + stat.replyCount, 0);
      }
       
      console.log(`[API /setter-stats] Total replies calculated (ALL ORGS): ${totalReplies}`);
      console.log('[API /setter-stats] Processed stats sample (ALL ORGS):', JSON.stringify(processedStats.slice(0, 3)));

      // Prepare response with *processed* data
      const response: StatsResponse = {
        data: processedStats,
        metadata: {
          dateFiltered,
          organizationId: 'ALL',
          totalUsers: processedStats.length,
          totalReplies
        }
      };
      
      if (dateFiltered) {
        response.metadata.startDate = parsedStartDate.toISOString();
        response.metadata.endDate = parsedEndDate.toISOString();
      }
      
      // This response object is now guaranteed to not contain BigInts
      return NextResponse.json(response); 

    } catch (dbError) {
      console.error('[API /setter-stats] Database error (ALL ORGS query):', dbError);
      return NextResponse.json({ error: 'Database query failed', details: { message: dbError instanceof Error ? dbError.message : String(dbError)} }, { status: 500 });
    }

  } catch (error) {
    console.error('[API /setter-stats] General error (ALL ORGS query):', error);
    return NextResponse.json({ error: 'Internal server error', details: { message: error instanceof Error ? error.message : String(error)} }, { status: 500 });
  }
} 