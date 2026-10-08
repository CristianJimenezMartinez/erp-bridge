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
}
