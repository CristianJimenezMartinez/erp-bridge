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

export function sanitizeMessage(message: string): string {
  if (!message || typeof message !== 'string') return message;

  let sanitized = message;

  // 1. Claves de licencia de Bentian (ej. EB-XXXXX-XXXXX-XXXXX-XXXXX)
  sanitized = sanitized.replace(/\bEB-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}-[0-9A-HJ-NP-Z]{5}\b/g, 'EB-*****-*****-*****-*****');

  // 2. Tokens de autenticación Bearer y JWTs
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/gi, 'Bearer ***REDACTED***');
  sanitized = sanitized.replace(/\beyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/g, '***REDACTED_JWT***');

  // 3. Tokens de Stripe y API keys conocidos
  sanitized = sanitized.replace(/\b(sk_live_|sk_test_|whsec_|pk_live_|pk_test_)[0-9a-zA-Z]{16,}\b/g, '***REDACTED***');

  // 4. Pares clave=valor de credenciales sensibles (password, secret, token, apikey, etc.)
  sanitized = sanitized.replace(
    /((?:password|passwd|pass|secret|token|api_?key|consumer_?secret|credential|authorization)[\s]*[=:]\s*['"]?)([^'"\s,;]+)(['"]?)/gi,
    '$1***REDACTED***$3'
  );

  // 5. Números de tarjeta de crédito (Visa, Mastercard, Amex, Discover y formatos estándar)
  // Formato formateado con guiones o espacios (ej. 4532-1234-5678-9010)
  sanitized = sanitized.replace(/\b(?:\d{4}[ -]){3}\d{4}\b/g, '****-****-****-****');
  sanitized = sanitized.replace(/\b3[47]\d{2}[ -]\d{6}[ -]\d{5}\b/g, '****-******-*****');
  // Formato compacto (16 dígitos comenzando por 4, 5, 6 o 15 dígitos comenzando por 34/37)
  sanitized = sanitized.replace(/\b[456]\d{15}\b/g, '****************');
  sanitized = sanitized.replace(/\b3[47]\d{13}\b/g, '***************');
  // Claves explícitas de tarjetas
  sanitized = sanitized.replace(
    /((?:card_?number|cc_?num|pan|credit_?card|tarjeta)[\s]*[=:]\s*['"]?)([0-9 -]{13,19})(['"]?)/gi,
    '$1****-****-****-****$3'
  );

  return sanitized;
}

export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeMessage(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'string') {
      result[key] = sanitizeMessage(value);
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
    const cleanMessage = sanitizeMessage(message);
    const cleanContext = context ? (sanitizeObject(context) as Record<string, unknown>) : {};
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      context: this.contextName,
      message: cleanMessage,
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
