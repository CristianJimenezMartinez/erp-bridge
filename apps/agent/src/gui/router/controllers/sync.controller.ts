import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';

export class SyncController {
  public static getHistory(agent: LocalAgent): RouteHandler {
    return (_req, res) => {
      const history = agent.getSyncHistory();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
    };
  }

  public static syncNow(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const result = await agent.triggerManualSync();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static uploadCatalog(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const result = await agent.uploadCatalog(ctx.body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
