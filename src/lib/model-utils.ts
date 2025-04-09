import { randomUUID } from 'crypto';

/**
 * Adds required fields to model data for Prisma create operations
 * This is needed because Prisma expects certain fields that would 
 * normally be handled by @default or @updatedAt attributes
 */
export function addRequiredModelFields(data: any) {
  return {
    ...data,
    id: randomUUID(),
    updatedAt: new Date(),
  };
}

/**
 * Adds required fields to Organization model data
 * Organizations have special requirements like webhookUrl
 */
export function addRequiredOrgFields(data: any) {
  // For organizations, generate a unique webhook URL if not provided
  const baseData = addRequiredModelFields(data);
  
  // Only add webhookUrl if it's not already provided
  if (!data.webhookUrl) {
    const webhookId = randomUUID();
    baseData.webhookUrl = `https://api.tempshift.com/webhook/${webhookId}`;
  }
  
  return baseData;
}
