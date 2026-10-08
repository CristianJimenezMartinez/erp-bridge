import http from 'http';
import { Logger } from '@erp-bridge/shared';

export interface RequestContext {
  parsedUrl: URL;
  pathname: string;
  body: any;
  params?: Record<string, string>;
}

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RequestContext
) => Promise<void> | void;

export class MiniRouter {
  private readonly logger = new Logger('MiniRouter');
  private routes: Array<{ method: string; path: string; handler: RouteHandler }> = [];

  constructor(private readonly localToken?: string) {}

  public get(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'GET', path, handler });
  }

  public post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'POST', path, handler });
  }

  public any(methods: string[], path: string, handler: RouteHandler): void {
    for (const m of methods) {
      this.routes.push({ method: m.toUpperCase(), path, handler });
    }
  }

  public async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 0. Cabeceras de seguridad HTTP básicas
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 1. Host Validation: debe ser estrictamente 127.0.0.1 o localhost (con o sin puerto)
    // Se valida ANTES de procesar URLs para evitar excepciones no controladas
    const host = req.headers.host || '';
    const loopbackHostRegex = /^(127\.0\.0\.1|localhost)(:\d+)?$/;
    if (!loopbackHostRegex.test(host)) {
      this.logger.warn(`Acceso denegado por cabecera Host no autorizada: "${host}"`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Acceso denegado: Host no autorizado' }));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(req.url || '/', `http://${host}`);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'URL malformada' }));
      return;
    }

    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    // 2. Validación de Sec-Fetch-Site: si está presente y su valor es cross-site, bloquear con 403 Forbidden
    const secFetchSite = req.headers['sec-fetch-site'];
    if (secFetchSite === 'cross-site') {
      this.logger.warn(`Acceso bloqueado: Sec-Fetch-Site no permitido (${secFetchSite})`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Acceso denegado: cross-site fetch no permitido' }));
      return;
    }

    // 3. Anti-CSRF: Validación estricta de Origin y Referer para orígenes loopback
    const loopbackOriginRegex = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
    const origin = req.headers.origin;
    if (origin) {
      if (!loopbackOriginRegex.test(origin)) {
        this.logger.warn(`Acceso bloqueado: Origin externo no permitido: ${origin}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Acceso denegado: Origen no autorizado' }));
        return;
      }
    }

    const referer = req.headers.referer;
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const refOrigin = `${refUrl.protocol}//${refUrl.host}`;
        if (!loopbackOriginRegex.test(refOrigin)) {
          this.logger.warn(`Acceso bloqueado: Referer externo no permitido: ${referer}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Acceso denegado: Origen no autorizado' }));
          return;
        }
      } catch {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Acceso denegado: Origen no autorizado' }));
        return;
      }
    }

    // 4. Para peticiones POST con Origin definido, exigir Content-Type: application/json
    if (origin && (method === 'POST' || method === 'PUT')) {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        this.logger.warn(`Acceso bloqueado: POST con Origin requiere Content-Type application/json: "${contentType}"`);
        res.writeHead(415, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Content-Type debe ser application/json' }));
        return;
      }
    }

    // 5. Cabeceras CORS restrictivas para loopback
    const allowedOrigin = origin || `http://${host || '127.0.0.1'}`;
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bentian-Token, X-Local-Token');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 6. Validación de Token de sesión local (X-Bentian-Token)
    // MANDATORIO CRÍTICO: BentianTray.cs llama a la API local sin Origin ni Sec-Fetch-Site y sin token.
    // Las peticiones locales sin Origin y sin Sec-Fetch-Site procedentes de 127.0.0.1 siguen permitidas.
    const isBrowserRequest = Boolean(origin || secFetchSite);
    const isApiRoute = pathname.startsWith('/api/local/') || pathname.startsWith('/v1/');
    const isPublicAsset = pathname === '/api/local/icon' || pathname === '/api/local/health' || pathname === '/health';

    if (this.localToken && isBrowserRequest && isApiRoute && !isPublicAsset) {
      const receivedToken = req.headers['x-bentian-token'] || req.headers['x-local-token'];
      if (receivedToken !== this.localToken) {
        this.logger.warn(`Acceso bloqueado: Token de sesión local inválido o ausente en ${method} ${pathname}`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Acceso denegado: Token de sesión local no válido' }));
        return;
      }
    }

    const matchMethod = method === 'HEAD' ? 'GET' : method;
    let route = this.routes.find((r) => r.method === matchMethod && r.path === pathname);
    let routeParams: Record<string, string> = {};

    if (!route) {
      for (const r of this.routes) {
        if (r.method === matchMethod && r.path.includes(':')) {
          const match = MiniRouter.matchParameterizedPath(r.path, pathname);
          if (match) {
            route = r;
            routeParams = match;
            break;
          }
        }
      }
    }

    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
      return;
    }

    let body: any = {};
    if (method === 'POST' || method === 'PUT') {
      try {
        body = await this.readRequestBody(req);
      } catch (err: any) {
        if (err?.statusCode === 413) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload demasiado grande (límite 1 MB)' }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error al procesar el cuerpo de la petición' }));
        return;
      }
    }

    const ctx: RequestContext = {
      parsedUrl,
      pathname,
      body,
      params: routeParams,
    };

    const start = performance.now();
    try {
      await route.handler(req, res, ctx);
      const durationMs = Math.round((performance.now() - start) * 10) / 10;

      // Omitir logs ruidosos de polling cada 3s (/api/local/status y /api/local/logs) para no saturar
      const isPolling = pathname === '/api/local/status' || pathname === '/api/local/logs';
      if (!isPolling) {
        try {
          const { AgentDiskLogger } = await import('../../diagnostics/disk-logger');
          AgentDiskLogger.getInstance().log({
            level: 'INFO',
            component: 'MiniRouter',
            action: `${method} ${pathname}`,
            duration_ms: durationMs,
            status: 'SUCCESS',
            message: `Ruta ${method} ${pathname} ejecutada en ${durationMs} ms`,
          });
        } catch {}
      }
    } catch (err) {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      try {
        const { AgentDiskLogger } = await import('../../diagnostics/disk-logger');
        AgentDiskLogger.getInstance().log({
          level: 'ERROR',
          component: 'MiniRouter',
          action: `${method} ${pathname}`,
          duration_ms: durationMs,
          status: 'FAILURE',
          message: `Fallo procesando ${method} ${pathname}: ${String(err)}`,
          error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { message: String(err) },
        });
      } catch {}
      this.logger.error(`Error procesando ruta ${method} ${pathname}:`, { err: String(err) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  }

  private readRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      let bytes = 0;
      const MAX_BODY_SIZE = 1024 * 1024; // Límite estricto de 1 MB

      const onData = (chunk: Buffer | string) => {
        bytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
        if (bytes > MAX_BODY_SIZE) {
          req.removeListener('data', onData);
          req.removeListener('end', onEnd);
          const err = new Error('Payload too large: límite de 1 MB excedido');
          (err as any).statusCode = 413;
          reject(err);
          return;
        }
        data += chunk;
      };

      const onEnd = () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      };

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', (err) => reject(err));
    });
  }

  public static matchParameterizedPath(pattern: string, pathname: string): Record<string, string> | null {
    const pSegments = pattern.split('/').filter(Boolean);
    const aSegments = pathname.split('/').filter(Boolean);
    if (pSegments.length !== aSegments.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < pSegments.length; i++) {
      const p = pSegments[i];
      const a = aSegments[i];
      if (typeof p !== 'string' || typeof a !== 'string') return null;
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(a);
      } else if (p !== a) {
        return null;
      }
    }
    return params;
  }
}
