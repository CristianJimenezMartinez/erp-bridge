export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  organizationId?: string;
  connectionId?: string;
  connectorId?: string;
  jobId?: string;
  executionId?: string;
  traceId?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'consumersecret',
  'consumer_secret',
  'apikey',
  'api_key',
  'credential',
  'authorization',
]);

export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class Logger {
  constructor(private contextName: string) {}

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const cleanContext = context ? (sanitizeObject(context) as Record<string, unknown>) : {};
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      context: this.contextName,
      message,
      ...(typeof cleanContext === 'object' && cleanContext !== null ? cleanContext : {}),
    });
  }

  debug(message: string, context?: LogContext): void {
    if (process.env['LOG_LEVEL'] === 'debug') {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errObj = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack }
      : { errorDetail: String(error) };

    console.error(this.formatMessage('error', message, { ...context, ...errObj }));
  }
}
