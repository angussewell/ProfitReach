import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import prisma from '@/lib/prisma'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Replace variables in a template string with their values
 * @param template The template string containing variables in {{variableName}} format
 * @param variables Object containing variable names and their values
 * @returns The template string with variables replaced
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return variables[variable] || match;
  });
}

// Production-ready logging
export function log(level: 'error' | 'info' | 'warn', message: string, data?: any) {
  console[level](JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.VERCEL_ENV || 'development',
    ...data
  }));
}

// Re-export prisma instance
export { prisma } 