import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { renderDashboardHtml } from '../../ui-template';
import { openDesktopWindow } from '../../window-launcher';

const logger = new Logger('SystemController');

export class SystemController {
  public static renderIndex(agent: LocalAgent): RouteHandler {
    return (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboardHtml(agent.getVersion()));
    };
  }

  public static saveFullConfig(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const result = await agent.saveFullConfig(ctx.body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
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
}
