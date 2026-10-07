import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const token = getToken ? getToken() : '';
      res.end(renderDashboardHtml(agent.getVersion(), token));
    };
  }

  public static saveFullConfig(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
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

  public static openWindow(getUrl: () => string): RouteHandler {
    return (_req, res) => {
      logger.info('Solicitud de apertura de ventana recibida desde System Tray o CLI.');
      const opened = openDesktopWindow(getUrl());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: opened, url: getUrl() }));
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
