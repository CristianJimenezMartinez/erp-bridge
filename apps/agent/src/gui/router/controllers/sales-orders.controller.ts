import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';

export class SalesOrdersController {
  public static getOrders(agent: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      const sp = ctx.parsedUrl.searchParams;
      const page = parseInt(sp.get('page') || '1', 10);
      const limit = parseInt(sp.get('limit') || '20', 10);
      const range = sp.get('range') || 'all';
      const search = sp.get('search') || '';
      const status = (sp.get('status') || 'all') as any;

      const result = agent.getSalesOrders({
        page,
        limit,
        range,
        search,
        status,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static getOrderById(agent: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      const id = ctx.params?.id || ctx.pathname.split('/').pop() || '';
      const order = agent.getSalesOrderById(id);

      if (!order) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Pedido #${id} no encontrado` }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(order));
    };
  }

  public static retryOrder(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const id = ctx.params?.id || '';
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'ID de pedido no especificado' }));
        return;
      }

      const result = await agent.retrySalesOrder(id);
      const statusCode = result.success ? 200 : 400;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static simulateTestOrder(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      try {
        const body = (ctx.body && typeof ctx.body === 'object') ? ctx.body : {};
        const dryRun = body.dryRun !== undefined ? Boolean(body.dryRun) : true;
        const targetArticleCode = typeof body.targetArticleCode === 'string' ? body.targetArticleCode : undefined;
        const orderSeries = typeof body.orderSeries === 'string' ? body.orderSeries : undefined;
        const dbPath = typeof body.dbPath === 'string' ? body.dbPath.trim() : undefined;

        if (dbPath && /[\x00-\x1f;'"\x60]/.test(dbPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Caracteres no válidos en la ruta de base de datos (; \' " ` o caracteres de control)' }));
          return;
        }

        const result = await agent.simulateTestOrder({
          dryRun,
          targetArticleCode,
          orderSeries,
          dbPath,
        });

        const statusCode = result.success ? 200 : 400;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: msg }));
      }
    };
  }
}

