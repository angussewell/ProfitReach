/**
 * Schema validation utilities to detect mismatches between Prisma schema and database
 */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Interface for database column information
 */
interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

/**
 * Check if the WorkflowDefinition table schema matches expected structure
 * This can help identify schema sync issues when working with $executeRaw
 */
export async function checkWorkflowDefinitionSchema(prisma: PrismaClient): Promise<{ 
  isValid: boolean; 
  issues: string[]; 
  columnInfo?: ColumnInfo[] 
}> {
  const issues: string[] = [];
  
  try {
    // Query the database directly to get column information for WorkflowDefinition table
    const columns = await prisma.$queryRaw<ColumnInfo[]>`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'WorkflowDefinition'
      ORDER BY 
        ordinal_position;
    `;
    
    console.log('[SCHEMA-CHECK] Retrieved WorkflowDefinition columns:', JSON.stringify(columns, null, 2));
    
    // Check for required columns
    const requiredColumns = [
      'workflowId', 
      'organizationId', 
      'name', 
      'steps', 
      'isActive',
      'createdAt',
      'updatedAt'
    ];
    
    const columnNames = columns.map(col => col.column_name);
    
    for (const required of requiredColumns) {
      if (!columnNames.includes(required)) {
        issues.push(`Missing required column: "${required}"`);
      }
    }
    
    // Check specific column types
    const columnMap = columns.reduce((map, col) => {
      map[col.column_name] = col;
      return map;
    }, {} as Record<string, ColumnInfo>);
    
    // Specific checks for columns that might cause issues
    if (columnMap.dripStartTime && !columnMap.dripStartTime.data_type.includes('time')) {
      issues.push(`Column "dripStartTime" has unexpected type: ${columnMap.dripStartTime.data_type}, expected: time`);
    }
    
    if (columnMap.dripEndTime && !columnMap.dripEndTime.data_type.includes('time')) {
      issues.push(`Column "dripEndTime" has unexpected type: ${columnMap.dripEndTime.data_type}, expected: time`);
    }
    
    if (columnMap.steps && !columnMap.steps.data_type.includes('json')) {
      issues.push(`Column "steps" has unexpected type: ${columnMap.steps.data_type}, expected: jsonb`);
    }
    
    if (columnMap.workflowId && !columnMap.workflowId.data_type.includes('uuid')) {
      issues.push(`Column "workflowId" has unexpected type: ${columnMap.workflowId.data_type}, expected: uuid`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      columnInfo: columns,
    };
  } catch (error) {
    console.error('[SCHEMA-CHECK] Failed to check schema:', error);
    return {
      isValid: false,
      issues: [`Failed to check schema: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Schema diagnostics endpoint handler - can be used in API routes
 * to expose schema information for debugging
 */
export async function getSchemaInfo(prisma: PrismaClient, tableName: string) {
  try {
    const result = await prisma.$queryRaw<ColumnInfo[]>`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns
      WHERE 
        table_name = ${tableName}
      ORDER BY 
        ordinal_position;
    `;
    
    return {
      success: true,
      schema: result
    };
  } catch (error) {
    console.error(`[SCHEMA-INFO] Failed to get schema for ${tableName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a debugging endpoint to diagnose workflow creation issues
 */
export async function testWorkflowCreation(prisma: PrismaClient, payload: any, organizationId: string) {
  const results = {
    schemaCheck: null as any,
    validationResults: null as any,
    sqlAttempt: null as any,
    error: null as any
  };
  
  try {
    // 1. Schema check
    results.schemaCheck = await checkWorkflowDefinitionSchema(prisma);
    
    // 2. Log the actual SQL that would be generated
    // This is for diagnostic purposes only
    const testId = 'test-uuid';
    const stepsJson = JSON.stringify(payload.steps || []);
    
    const sqlStatement = Prisma.sql`
      INSERT INTO "WorkflowDefinition" (
        "workflowId", 
        "organizationId", 
        "name", 
        "description", 
        "dailyContactLimit", 
        "dripStartTime", 
        "dripEndTime", 
        "timezone", 
        "isActive", 
        "steps", 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        ${testId}::uuid, 
        ${organizationId}, 
        ${payload.name || 'Test Workflow'}, 
        ${payload.description || null}, 
        ${payload.dailyContactLimit || null}, 
        ${payload.dripStartTime || null}::time, 
        ${payload.dripEndTime || null}::time, 
        ${payload.timezone || null},
        true,
        ${stepsJson}::jsonb,
        NOW(),
        NOW()
      );
    `;
    
    // Only log the SQL, don't actually execute it
    const sqlString = sqlStatement.values.reduce((sql: string, value, i) => {
      return sql.replace(`$${i + 1}`, value === null ? 'NULL' : `'${value}'`);
    }, sqlStatement.strings.join(''));
    
    results.sqlAttempt = {
      generatedSql: sqlString
    };
    
    return results;
  } catch (error) {
    results.error = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : String(error);
    return results;
  }
}
