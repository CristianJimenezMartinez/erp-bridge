import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { openWindowsFileDialog } from '../../window-launcher';

const logger = new Logger('SimplyGestController');

export class SimplyGestController {
  public static openNativeFileDialog(agent?: LocalAgent): RouteHandler {
    return async (req, res, ctx) => {
      try {
        let initialPath =
          (ctx?.body && ctx.body.currentPath) ||
          ctx?.parsedUrl?.searchParams?.get('currentPath') ||
          undefined;

        if (initialPath) {
          const trimmed = String(initialPath).trim();
          const isUnc = /^\\\\|^\/\//.test(trimmed);
          if (isUnc && req.method === 'GET') {
            logger.warn(`Intento de fuga NTLM bloqueado en GET /open-file-dialog-simplygest: "${trimmed}"`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Rutas UNC de red no permitidas en peticiones GET' }));
            return;
          }
          if (/[\x00-\x1f<>"|?*]/.test(trimmed)) {
            logger.warn(`Caracteres de control no válidos en ruta open-file-dialog-simplygest: "${trimmed}"`);
            initialPath = undefined;
          } else {
            initialPath = trimmed;
          }
        }

        if (!initialPath && agent) {
          initialPath =
            agent.configManager?.get()?.simplygestDbPath ||
            agent.configManager?.get()?.simplygest?.databasePath;
        }

        const filePath = await openWindowsFileDialog(
          'Seleccionar Base de Datos SimplyGest (Datos.mdb)',
          'Base de datos SimplyGest (Datos.mdb;*.mdb)|Datos.mdb;*.mdb;*.accdb',
          initialPath
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (filePath) {
          res.end(JSON.stringify({ success: true, filePath }));
        } else {
          res.end(JSON.stringify({ success: false, cancelled: true }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: String(err) }));
      }
    };
  }

  public static detectSimplyGest(agent?: LocalAgent): RouteHandler {
    return (_req, res) => {
      logger.info('Escaneando discos en busca de SimplyGest (Datos.mdb)...');
      const instances = agent ? agent.detectSimplyGest() : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ instances }));
    };
  }

  public static testSimplyGest(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const dbPath = ctx.body?.databasePath || '';
      if (/[\x00-\x1f;'"\x60]/.test(dbPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta de base de datos (; \' " ` o caracteres de control)' }));
        return;
      }
      const t0 = performance.now();
      const result = await agent.testSimplyGestConnection(dbPath);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }

  public static getPreview(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const preview = await agent.getSimplyGestPreviewArticles(25);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(preview));
    };
  }

  public static resolvePath(agent: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      const inputPath = ctx.body?.path || '';
      if (/[\x00-\x1f;'"\x60]/.test(inputPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta (; \' " ` o caracteres de control)' }));
        return;
      }
      const result = agent.resolveSimplyGestPath(inputPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
