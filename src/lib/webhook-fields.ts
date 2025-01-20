import { prisma } from './db';

// Helper to extract all possible fields from a data structure
export function extractFields(data: any, prefix = ''): string[] {
  if (!data || typeof data !== 'object') return [];
  
  return Object.entries(data).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Handle different value types
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        return [fullKey];
      } else {
        return [fullKey, ...extractFields(value, fullKey)];
      }
    }
    return [fullKey];
  });
}

// Register webhook fields
export async function registerWebhookFields(data: any) {
  try {
    // Extract fields from both top level and contactData
    const topLevelFields = extractFields(data);
    const contactDataFields = data.contactData ? extractFields(data.contactData, 'contactData') : [];
    const allFields = [...new Set([...topLevelFields, ...contactDataFields])];
    
    console.log('Registering webhook fields:', allFields);
    
    // Update field registry
    const results = await Promise.all(
      allFields.map(async (field) => {
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
          console.error(`Failed to upsert field ${field}:`, error);
          return null;
        }
      })
    );
    
    return {
      success: true,
      fieldsRegistered: results.filter(Boolean).length,
      totalFields: allFields.length
    };
  } catch (error) {
    console.error('Failed to register webhook fields:', error);
    throw error;
  }
} 