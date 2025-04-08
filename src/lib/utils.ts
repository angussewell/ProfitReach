import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Logging utility function for consistent logging across the app
 * @param level - The log level ('info', 'warn', 'error', 'debug')
 * @param message - The message to log
 * @param data - Optional data to include in the log
 */
export function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logObj = {
    timestamp,
    level,
    message,
    data
  };
  
  switch (level) {
    case 'error':
      console.error(JSON.stringify(logObj));
      break;
    case 'warn':
      console.warn(JSON.stringify(logObj));
      break;
    case 'debug':
      console.debug(JSON.stringify(logObj));
      break;
    case 'info':
    default:
      console.log(JSON.stringify(logObj));
      break;
  }
}
