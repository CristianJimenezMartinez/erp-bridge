import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';

export class LicenseController {
  public static activateLicense(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const result = await agent.activateLicense(ctx.body.licenseKey || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
