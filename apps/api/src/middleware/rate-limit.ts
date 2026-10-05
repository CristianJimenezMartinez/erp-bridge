import type { NextFunction, Request, Response } from 'express';

/**
 * Rate limiter en memoria (ventana fija) sin dependencias externas.
 * La clave por defecto es req.ip, que respeta `trust proxy` de Express; nunca se lee
 * X-Forwarded-For directamente para que el cliente no pueda rotar su identidad.
 */
export interface RateLimitOptions {
  /** Identificador de la política (se usa para aislar contadores entre rutas). */
  name: string;
  windowMs: number;
  max: number;
  /** Función de clave alternativa (por defecto, IP del cliente). */
  keyFn?: (req: Request) => string;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, Bucket>>();

export function resetRateLimiters(): void {
  for (const store of stores.values()) {
    store.clear();
  }
}

/** Comprueba y consume un intento. Devuelve segundos de espera si se excede el límite. */
export function consumeRateLimit(
  name: string,
  key: string,
  windowMs: number,
  max: number,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }

  // Limpieza oportunista para acotar memoria
  if (store.size > 5000) {
    for (const [k, b] of store.entries()) {
      if (now >= b.resetAt) store.delete(k);
    }
  }

  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimit(options: RateLimitOptions) {
  const { name, windowMs, max, keyFn, message } = options;
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn ? keyFn(req) : req.ip || req.socket.remoteAddress || 'unknown';
    const result = consumeRateLimit(name, key, windowMs, max);
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: message || 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
          retryAfterSeconds: result.retryAfterSeconds,
        },
      });
      return;
    }
    next();
  };
}
