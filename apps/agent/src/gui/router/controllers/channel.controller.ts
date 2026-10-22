import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { CompanionGenerator, isSecretMaskedOrEmpty } from '../../../channels';

export class ChannelController {
  public static testWooCommerce(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      if (agent?.configManager && ctx.body && typeof ctx.body === 'object' && ctx.body.storeUrl) {
        try {
          const current = agent.configManager.get();
          const existingSecret = current.woocommerce?.consumerSecret || '';
          agent.configManager.update({
            channelType: 'woocommerce',
            woocommerce: {
              ...(current.woocommerce || { storeUrl: '', consumerKey: '', consumerSecret: '', enabled: true }),
              storeUrl: String(ctx.body.storeUrl || '').trim(),
              consumerKey: String(ctx.body.consumerKey || current.woocommerce?.consumerKey || '').trim(),
              consumerSecret: isSecretMaskedOrEmpty(ctx.body.consumerSecret) ? existingSecret : String(ctx.body.consumerSecret).trim(),
              enabled: true,
            },
          });
        } catch {}
      }
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
      if (agent?.configManager && ctx.body && typeof ctx.body === 'object' && ctx.body.storeUrl) {
        try {
          const current = agent.configManager.get();
          const existingSecret = current.universalBridge?.secretKey || '';
          agent.configManager.update({
            channelType: 'universal_bridge',
            universalBridge: {
              ...(current.universalBridge || { storeUrl: '', secretKey: '', enabled: true }),
              storeUrl: String(ctx.body.storeUrl || '').trim(),
              secretKey: isSecretMaskedOrEmpty(ctx.body.secretKey) ? existingSecret : String(ctx.body.secretKey).trim(),
              enabled: true,
            },
          });
        } catch {}
      }
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

  public static testShopify(agent: LocalAgent): RouteHandler {
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
      const result = await agent.testShopifyConnection(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs: result.durationMs ?? durationMs }));
    };
  }

  public static testPrestashop(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const lic = agent.getLicenseStatus();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            message: `Acción bloqueada: Se requiere una licencia activa (${lic.status}) para conectar y validar la tienda web. Activa tu clave en la pestaña Licencia.`,
            durationMs: 0,
            latencyMs: 0,
            checks: { serverOnline: false, sslValid: false, apiActive: false, permissionsOk: false },
          })
        );
        return;
      }
      const t0 = performance.now();
      const result = await agent.testPrestashopConnection(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs: result.latencyMs ?? durationMs }));
    };
  }

  public static testHolded(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const lic = agent.getLicenseStatus();
      if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            latencyMs: 0,
            message: `Acción bloqueada: Se requiere una licencia activa (${lic.status}) para conectar y validar el ERP cloud. Activa tu clave en la pestaña Licencia.`,
            durationMs: 0,
          })
        );
        return;
      }
      const t0 = performance.now();
      const result = await agent.testHoldedConnection(ctx.body);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: result.success,
          latencyMs: result.latencyMs ?? 0,
          message: result.message || (result.success ? 'Conexión verificada exitosamente' : 'Fallo en la conexión con Holded'),
          durationMs,
        })
      );
    };
  }

  public static downloadCompanion(): RouteHandler {
    return (_req, res, ctx) => {
      const body = ctx.body || {};
      const secretKey = body.secretKey || ctx.parsedUrl.searchParams.get('secretKey') || undefined;
      const dbName = body.dbName || ctx.parsedUrl.searchParams.get('dbName') || undefined;
      const dbUser = body.dbUser || ctx.parsedUrl.searchParams.get('dbUser') || undefined;
      const dbPass = body.dbPass || ctx.parsedUrl.searchParams.get('dbPass') || undefined;

      const customized = CompanionGenerator.generate({ secretKey, dbName, dbUser, dbPass });
      const payload = Buffer.from(customized, 'utf8');

      res.writeHead(200, {
        'Content-Type': 'application/x-php; charset=utf-8',
        'Content-Disposition': 'attachment; filename="erp-bridge-endpoint.php"',
        'Content-Length': payload.length.toString(),
      });
      res.end(payload);
    };
  }
}
