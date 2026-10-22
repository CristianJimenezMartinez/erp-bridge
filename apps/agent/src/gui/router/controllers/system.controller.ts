import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { isSecretMaskedOrEmpty } from '../../../channels';
import { renderDashboardHtml } from '../../ui-template';
import { openDesktopWindow } from '../../window-launcher';
import {
  OFFICIAL_BENTIAN_SVG,
  OFFICIAL_MANIFEST_JSON,
  getOfficialIconBuffer,
} from '../../assets/icon-data';

const logger = new Logger('SystemController');

export class SystemController {
  public static renderIndex(agent: LocalAgent, getToken?: () => string): RouteHandler {
    return (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      const token = getToken ? getToken() : '';
      res.end(renderDashboardHtml(agent.getVersion(), token));
    };
  }

  public static saveFullConfig(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const candidatePaths = [
        ctx.body?.factusol?.databasePath,
        ctx.body?.factusolDbPath,
        ctx.body?.simplygest?.databasePath,
        ctx.body?.simplygestDbPath,
        ctx.body?.softwareErp?.providers?.factusol?.databasePath,
        ctx.body?.softwareErp?.providers?.simplygest?.databasePath,
      ];
      for (const p of candidatePaths) {
        if (typeof p === 'string' && /[\x00-\x1f;'"\x60]/.test(p)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'La ruta de base de datos contiene caracteres no permitidos (; \' " ` o caracteres de control).'
          }));
          return;
        }
      }

      let lic = agent.licenseService?.getLicenseStatus();
      const incomingLicKey = typeof ctx.body?.licenseKey === 'string' ? ctx.body.licenseKey.trim() : '';
      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD' && !incomingLicKey) {
        const storedKey = agent.configManager?.get()?.licenseKey?.trim();
        if (storedKey && agent.licenseService) {
          try {
            await agent.licenseService.validateLicense();
            lic = agent.licenseService.getLicenseStatus();
          } catch {}
        }
      }

      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD' && !incomingLicKey) {
        // Persistir borrador en disco en AppData para que los campos nunca aparezcan vacíos al cerrar y abrir
        if (agent.configManager && ctx.body && typeof ctx.body === 'object') {
          try {
            const current = agent.configManager.get();
            const draftFactPath = ctx.body.factusol?.databasePath ?? ctx.body.factusolDbPath ?? current.factusolDbPath;
            const existingUnivSecret = current.universalBridge?.secretKey || '';
            const existingUnivDbPass = current.universalBridge?.dbPass || '';
            const nextUniv = ctx.body.universalBridge
              ? {
                  ...(current.universalBridge || { storeUrl: '', secretKey: '', enabled: true }),
                  ...ctx.body.universalBridge,
                  secretKey: isSecretMaskedOrEmpty(ctx.body.universalBridge.secretKey)
                    ? existingUnivSecret
                    : ctx.body.universalBridge.secretKey,
                  dbPass: isSecretMaskedOrEmpty(ctx.body.universalBridge.dbPass)
                    ? existingUnivDbPass
                    : ctx.body.universalBridge.dbPass,
                }
              : current.universalBridge;
            const existingWooSecret = current.woocommerce?.consumerSecret || '';
            const nextWoo = ctx.body.woocommerce
              ? {
                  ...(current.woocommerce || { storeUrl: '', consumerKey: '', consumerSecret: '', enabled: false }),
                  ...ctx.body.woocommerce,
                  consumerSecret: isSecretMaskedOrEmpty(ctx.body.woocommerce.consumerSecret)
                    ? existingWooSecret
                    : ctx.body.woocommerce.consumerSecret,
                }
              : current.woocommerce;

            agent.configManager.update({
              erpType: ctx.body.erpType || current.erpType,
              channelType: ctx.body.channelType || current.channelType,
              factusolDbPath: draftFactPath,
              factusol: ctx.body.factusol ? { ...(current.factusol || { tariffCode: '1', warehouseCode: 'GEN' }), ...ctx.body.factusol } : current.factusol,
              simplygest: ctx.body.simplygest ? { ...(current.simplygest || { tariffCode: 1, warehouseCode: '1' }), ...ctx.body.simplygest } : current.simplygest,
              universalBridge: nextUniv,
              woocommerce: nextWoo,
              syncRules: ctx.body.syncRules ? { ...(current.syncRules || {}), ...ctx.body.syncRules } as any : current.syncRules,
            });
          } catch (draftErr) {
            logger.warn(`No se pudo persistir borrador previo a activación: ${String(draftErr)}`);
          }
        }
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Operación bloqueada: Necesitas activar una clave de licencia antes de guardar configuraciones del ERP o canales.'
        }));
        return;
      }
      const result = await agent.saveFullConfig(ctx.body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static testEmail(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      logger.info('Solicitud de prueba de email de alerta recibida.');
      const result = await agent.testEmailNotification(ctx.body?.notifications || ctx.body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static testTelegram(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      logger.info('Solicitud de prueba de alerta por Telegram recibida.');
      const result = await agent.testTelegramNotification(ctx.body?.notifications || ctx.body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static testDiscord(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      logger.info('Solicitud de prueba de alerta por Discord recibida.');
      const result = await agent.testDiscordNotification(ctx.body?.notifications || ctx.body);
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }

  public static openWindow(getUrl: () => string): RouteHandler {
    return (_req, res) => {
      logger.info('Solicitud de apertura de ventana recibida desde System Tray o CLI.');
      const opened = openDesktopWindow(getUrl());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: opened, url: getUrl() }));
    };
  }

  public static reportIncident(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      logger.info('Solicitud de reporte de incidencia recibida desde la GUI.');
      try {
        const body = ctx.body || {};
        if (!body.contact || !body.description) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'El contacto y la descripción son obligatorios.' }));
          return;
        }

        const result = await agent.reportIncident(body);
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        logger.error(`Error procesando reporte de incidencia: ${String(err)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: String(err) }));
      }
    };
  }

  public static checkUpdate(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      logger.info('Solicitud de comprobación de actualización recibida desde la GUI.');
      try {
        const channel = ctx.body?.channel;
        const checkResult = await agent.checkForUpdates(channel);
        const status = agent.getUpdateStatus();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            available: checkResult.available,
            update: status.pendingUpdate,
            status: status.status,
            currentVersion: status.currentVersion,
            checkResult,
          })
        );
      } catch (err) {
        logger.error(`Error comprobando actualizaciones: ${String(err)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: String(err) }));
      }
    };
  }

  public static applyUpdate(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      logger.info('Solicitud de aplicación de actualización recibida desde la GUI.');
      try {
        const result = await agent.applyUpdate();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        logger.error(`Error aplicando actualización: ${String(err)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: String(err) }));
      }
    };
  }

  public static getAutoStart(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      try {
        const enabled = await agent.isAutoStartEnabled();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, enabled }));
      } catch (err) {
        logger.error(`Error consultando estado de auto-start: ${String(err)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, enabled: false, message: String(err) }));
      }
    };
  }

  public static setAutoStart(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      try {
        const enabled = Boolean(ctx.body?.enabled);
        const success = await agent.setAutoStart(enabled);
        const currentStatus = await agent.isAutoStartEnabled();
        const message = success
          ? `Arranque automático ${enabled ? 'habilitado' : 'deshabilitado'} con éxito.`
          : `No se pudo ${enabled ? 'habilitar' : 'deshabilitar'} el arranque automático.`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success, enabled: currentStatus, message }));
      } catch (err) {
        logger.error(`Error actualizando auto-start: ${String(err)}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, enabled: false, message: String(err) }));
      }
    };
  }

  public static shutdown(agent: LocalAgent, stopServer: () => Promise<void>): RouteHandler {
    return (_req, res) => {
      logger.info('Solicitud de apagado del agente recibida.');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Apagando Bentian Agent...' }));

      setTimeout(async () => {
        try {
          await stopServer();
          await agent.stop();
        } catch {}
        process.exit(0);
      }, 300);
    };
  }

  public static serveFavicon(): RouteHandler {
    const icoBuf = getOfficialIconBuffer();
    return (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'image/x-icon',
        'Content-Length': icoBuf.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(icoBuf);
    };
  }

  public static serveManifest(): RouteHandler {
    const manifestBuf = Buffer.from(OFFICIAL_MANIFEST_JSON, 'utf-8');
    return (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Content-Length': manifestBuf.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(manifestBuf);
    };
  }

  public static serveIcon(): RouteHandler {
    const svgBuf = Buffer.from(OFFICIAL_BENTIAN_SVG, 'utf-8');
    return (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Length': svgBuf.length,
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(svgBuf);
    };
  }
}
