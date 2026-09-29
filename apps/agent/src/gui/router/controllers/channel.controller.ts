import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { CompanionGenerator } from '../../../channels';

export class ChannelController {
  public static testWooCommerce(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const lic = agent.getLicenseStatus();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message: `Acción bloqueada: Se requiere una licencia activa (${lic.status}) para conectar y validar la tienda web. Activa tu clave en la pestaña Licencia.`,
            durationMs: 0,
          })
        );
        return;
      }
      const t0 = performance.now();
      const result = await agent.testWooCommerceConnection(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }

  public static testUniversalBridge(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const lic = agent.getLicenseStatus();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            checks: { serverOnline: false, sslValid: false, endpointFound: false, databaseReady: false },
            message: `Acción bloqueada: Se requiere una licencia activa (${lic.status}) para conectar y validar la tienda web. Activa tu clave en la pestaña Licencia.`,
            durationMs: 0,
          })
        );
        return;
      }
      const t0 = performance.now();
      const result = await agent.testUniversalBridge(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }

  public static downloadCompanion(): RouteHandler {
    return (_req, res, ctx) => {
      const secretKey = ctx.parsedUrl.searchParams.get('secretKey') || undefined;
      const dbName = ctx.parsedUrl.searchParams.get('dbName') || undefined;
      const dbUser = ctx.parsedUrl.searchParams.get('dbUser') || undefined;
      const dbPass = ctx.parsedUrl.searchParams.get('dbPass') || undefined;

      const customized = CompanionGenerator.generate({ secretKey, dbName, dbUser, dbPass });
      if (!customized) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Plantilla erp-bridge-endpoint.php no encontrada' }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/x-php; charset=utf-8',
        'Content-Disposition': 'attachment; filename="erp-bridge-endpoint.php"',
      });
      res.end(customized);
    };
  }
}
