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

    // CORS headers for loopback
    res.setHeader('Access-Control-Allow-Origin', '*');
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
