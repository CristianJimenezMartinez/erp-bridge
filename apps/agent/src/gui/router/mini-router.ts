import http from 'http';
import { Logger } from '@erp-bridge/shared';

export interface RequestContext {
  parsedUrl: URL;
  pathname: string;
  body: any;
}

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RequestContext
) => Promise<void> | void;

export class MiniRouter {
  private readonly logger = new Logger('MiniRouter');
  private routes: Array<{ method: string; path: string; handler: RouteHandler }> = [];

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
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method || 'GET';

    // 1. Host Validation: debe ser estrictamente 127.0.0.1 o localhost (con o sin puerto)
    const host = req.headers.host || '';
    const loopbackHostRegex = /^(127\.0\.0\.1|localhost)(:\d+)?$/;
    if (!loopbackHostRegex.test(host)) {
      this.logger.warn(`Acceso denegado por cabecera Host no autorizada: "${host}"`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Acceso denegado: Host no autorizado' }));
      return;
    }

    // 2. Anti-CSRF: Validación estricta de Origin y Referer para orígenes loopback
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

    // 3. Cabeceras CORS restrictivas para loopback
    const allowedOrigin = origin || `http://${host || '127.0.0.1'}`;
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const route = this.routes.find((r) => r.method === method && r.path === pathname);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
      return;
    }

    let body: any = {};
    if (method === 'POST' || method === 'PUT') {
      body = await this.readRequestBody(req);
    }

    const ctx: RequestContext = {
      parsedUrl,
      pathname,
      body,
    };

    try {
      await route.handler(req, res, ctx);
    } catch (err) {
      this.logger.error(`Error procesando ruta ${method} ${pathname}:`, { err: String(err) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
  }

  private readRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });
  }
}
