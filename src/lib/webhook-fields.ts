import { prisma } from './db';

// Helper to extract all possible fields from a data structure
export function extractFields(data: any, prefix = ''): string[] {
  if (!data || typeof data !== 'object') return [];
  
  const fields: string[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Add the field with and without template syntax
    fields.push(fullKey);
    if (key.startsWith('{') && key.endsWith('}')) {
      fields.push(key.slice(1, -1)); // Add without braces
      fields.push(`${prefix}.${key.slice(1, -1)}`); // Add with prefix without braces
    } else {
      fields.push(`{${key}}`); // Add with braces
      if (prefix) {
        fields.push(`${prefix}.{${key}}`); // Add with prefix and braces
      }
    }
    
    // Handle nested objects
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        fields.push(fullKey);
      } else {
        fields.push(...extractFields(value, fullKey));
      }
    }
  });
  
  return [...new Set(fields)]; // Remove duplicates
}

// Production-ready logging
function log(level: 'error' | 'info', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

async function registerField(field: string, retryCount = 0): Promise<any> {
  try {
    return await prisma.webhookField.upsert({
      where: { field },
      create: { 
        field,
        lastSeen: new Date(),
        occurrences: 1
      },
      update: {
        lastSeen: new Date(),
        occurrences: { increment: 1 }
      }
    });
  } catch (error) {
    if (retryCount < 3) {
      log('info', 'Retrying field registration', { field, retryCount });
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return registerField(field, retryCount + 1);
    }
    log('error', 'Failed to register field after retries', { field, error: String(error) });
    return null;
  }
}

// Register webhook fields
export async function registerWebhookFields(data: any) {
  try {
    // Extract fields from both top level and contactData
    const topLevelFields = extractFields(data);
    const contactDataFields = data.contactData ? extractFields(data.contactData, 'contactData') : [];
    const allFields = [...new Set([...topLevelFields, ...contactDataFields])];
    
    log('info', 'Registering webhook fields', { fieldCount: allFields.length });
    
    // Update field registry with retries and better error handling
    const results = await Promise.all(
      allFields.map(field => registerField(field))
    );
    
    const successCount = results.filter(Boolean).length;
    log('info', 'Field registration complete', { 
      totalFields: allFields.length,
      successfulRegistrations: successCount,
      failedRegistrations: allFields.length - successCount
    });
    
    return {
      success: true,
      fieldsRegistered: successCount,
      totalFields: allFields.length
    };
  } catch (error) {
    log('error', 'Failed to register webhook fields', { error: String(error) });
    // Don't throw, just return error status
    return {
      success: false,
      error: String(error),
      fieldsRegistered: 0,
      totalFields: 0
    };
  }
}

/**
 * Gets all available webhook fields from field mappings
 */
export async function getWebhookFields(): Promise<string[]> {
  const fields = await prisma.webhookField.findMany({
    orderBy: { lastSeen: 'desc' }
  });
  
  // Get unique field names
  const uniqueFields = new Set<string>();
  
  fields.forEach(field => {
    uniqueFields.add(field.field);
    
    // Add variations of the field
    const plainField = field.field.replace(/[{}]/g, '');
    if (plainField !== field.field) {
      uniqueFields.add(plainField);
    }
    
    // Add with braces if it doesn't have them
    if (!field.field.includes('{')) {
      uniqueFields.add(`{${plainField}}`);
    }
  });

  // Add common fields that might not be mapped
  const commonFields = [
    'lifecycle_stage',
    'lead_status',
    'company',
    'PMS',
    'first_name',
    'last_name',
    'email',
    'make_sequence',
    'contactData.email',
    'contactData.first_name',
    'contactData.last_name',
    'contactData.company',
    'contactData.PMS',
    'contactData.make_sequence',
    'contactData.lifecycle_stage',
    'contactData.lead_status'
  ];

  commonFields.forEach(field => uniqueFields.add(field));

  return Array.from(uniqueFields).sort();
} 