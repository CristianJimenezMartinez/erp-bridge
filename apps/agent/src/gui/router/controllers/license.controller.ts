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

  public static claimBetaLicense(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      try {
        const body = ctx.body || {};
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';

        // Valida que email sea válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Dirección de correo electrónico no válida' }));
          return;
        }

        const payload = {
          email,
          companyName: companyName || email.split('@')[0],
          consentTerms: true,
          consentMarketing: true,
        };

        const config = agent.getConfig();
        const apiBase = (config.apiBaseUrl || 'https://bridge.cristianjm.com').replace(/\/+$/, '');

        // Llama al servidor central
        let centralRes = await fetch(`${apiBase}/licenses/claim-beta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Si responde 404, fallback al endpoint canónico de la API /api/v1/licenses/beta/claim
        if (centralRes.status === 404) {
          centralRes = await fetch(`${apiBase}/api/v1/licenses/beta/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        const rawData = (await centralRes.json().catch(() => null)) as any;

        if (!rawData) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Respuesta inválida del servidor central de licencias' }));
          return;
        }

        const licenseKey = rawData.licenseKey || rawData.data?.licenseKey;
        const expiresAt = rawData.expiresAt || rawData.data?.expiresAt;

        if (!centralRes.ok || !rawData.success || !licenseKey) {
          const errMsg = rawData.error?.message || rawData.message || rawData.error || 'No se pudo reclamar la licencia Beta';
          const statusCode = centralRes.status >= 400 && centralRes.status < 600 ? centralRes.status : 400;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errMsg }));
          return;
        }

        // Invoca inmediatamente la activación en el agente
        const activationResult = await agent.activateLicense(licenseKey);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          licenseKey,
          activationResult,
          expiresAt,
        }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || 'Error interno al reclamar licencia' }));
      }
    };
  }
}

