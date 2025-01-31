type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData, null, 2));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData, null, 2));
      break;
    default:
      console.log(JSON.stringify(logData, null, 2));
  }
} 