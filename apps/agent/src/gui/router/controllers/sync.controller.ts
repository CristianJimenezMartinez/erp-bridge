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
      const t0 = performance.now();
      const result = await agent.triggerManualSync();
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }

  public static uploadCatalog(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const t0 = performance.now();
      const result = await agent.uploadCatalog(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }
}
