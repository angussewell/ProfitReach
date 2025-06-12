import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createApiResponse } from '@/lib/filters';
import prisma from '@/lib/prisma';
import { checkWorkflowDefinitionSchema, getSchemaInfo, testWorkflowCreation } from '@/lib/schema-utils';
import { workflowCreateSchema } from '@/app/api/workflows/route';

/**
 * API endpoint for diagnosing workflow creation issues
 * This endpoint should only be available in development/staging environments
 */

export async function GET(request: NextRequest) {
  try {
    // Verify admin user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || session.user.role !== 'admin') {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized - Admin access required', 401);
      return NextResponse.json(response, { status });
    }

    const organizationId = session.user.organizationId;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'schema-check';
    
    // Check the database schema for WorkflowDefinition
    if (action === 'schema-check') {
      console.log('[DEBUG-WORKFLOWS] Running schema check for WorkflowDefinition');
      const schemaCheck = await checkWorkflowDefinitionSchema(prisma);
      
      return NextResponse.json({
        success: schemaCheck.isValid,
        data: {
          isValid: schemaCheck.isValid,
          issues: schemaCheck.issues,
          schema: schemaCheck.columnInfo
        }
      });
    }
    
    // Check schema for a specific table
    if (action === 'table-info') {
      const tableName = searchParams.get('table') || 'WorkflowDefinition';
      console.log(`[DEBUG-WORKFLOWS] Getting schema info for table: ${tableName}`);
      
      const tableInfo = await getSchemaInfo(prisma, tableName);
      return NextResponse.json({
        success: true,
        data: tableInfo
      });
    }
    
    // Default response
    return NextResponse.json({
      success: true,
      message: 'Workflow diagnostic endpoint',
      availableActions: ['schema-check', 'table-info']
    });
    
  } catch (error) {
    console.error('[DEBUG-WORKFLOWS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId || session.user.role !== 'admin') {
      const { response, status } = createApiResponse(false, undefined, 'Unauthorized - Admin access required', 401);
      return NextResponse.json(response, { status });
    }

    // Get organization ID from session
    const organizationId = session.user.organizationId;
    
    // Parse the JSON payload
    const json = await request.json();
    console.log('[DEBUG-WORKFLOWS] Debug test payload:', JSON.stringify(json, null, 2));
    
    // Validate with same schema used in the actual endpoint
    const validationResult = workflowCreateSchema.safeParse(json);
    
    // Test workflow creation without actually inserting to DB
    const results = await testWorkflowCreation(prisma, json, organizationId);
    
    // Add validation results
    results.validationResults = {
      isValid: validationResult.success,
      errors: validationResult.success ? null : validationResult.error.format()
    };
    
    return NextResponse.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('[DEBUG-WORKFLOWS] Error in POST:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
