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

/**
 * Normalize URLs so we store a consistent absolute form.
 * Returns `null` when the input cannot be parsed as a web URL, and
 * an empty string when the user intentionally clears the field.
 */
export function normalizeUrl(input: string): string | null {
  if (typeof input !== 'string') {
    return null
  }

  const trimmed = input.trim()
  if (trimmed === '') {
    return ''
  }

  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  url.hostname = url.hostname.toLowerCase()

  if (url.protocol === 'http:' && url.port === '80') {
    url.port = ''
  }
  if (url.protocol === 'https:' && url.port === '443') {
    url.port = ''
  }

  if (url.pathname === '/') {
    url.pathname = ''
  }

  let normalized = url.toString()

  if (
    (url.pathname === '' || url.pathname === '/') &&
    !url.search &&
    !url.hash &&
    normalized.endsWith('/')
  ) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}
