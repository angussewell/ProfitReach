import { prisma } from '@/lib/prisma';

// Extract all fields from a data structure
function extractFields(data: any): string[] {
  if (!data || typeof data !== 'object') return [];
  
  const fields: string[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    // Add the current field
    fields.push(key);
    
    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      fields.push(...extractFields(value));
    }
  });
  
  return [...new Set(fields)]; // Remove duplicates
}

// Register webhook fields
export async function registerWebhookFields(data: any) {
  try {
    // Extract all unique fields
    const fields = extractFields(data);
    
    // Register each field
    await Promise.all(fields.map(field => 
      prisma.webhookField.upsert({
        where: { name: field },
        create: { 
          name: field,
          originalName: field,
          description: `Field from webhook: ${field}`,
          type: 'string'
        },
        update: {}
      })
    ));

    return { success: true, fieldsRegistered: fields.length };
  } catch (error) {
    console.error('Failed to register webhook fields:', error);
    return { success: false, error: String(error) };
  }
}

// Get all webhook fields
export async function getWebhookFields(): Promise<string[]> {
  const fields = await prisma.webhookField.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  
  return fields.map(f => f.name).sort();
} 