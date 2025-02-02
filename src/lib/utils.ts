import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Replace variables in a template string with their values
 * Supports both {{variable}} and {variable} syntax
 * @param template The template string containing variables
 * @param variables Object containing variable names and their values
 * @returns The template string with variables replaced
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  // First replace double-bracketed variables
  let result = template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return variables[variable] || match;
  });
  
  // Then replace single-bracketed variables
  result = result.replace(/\{(\w+)\}/g, (match, variable) => {
    return variables[variable] || match;
  });
  
  return result;
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