import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { FactusolDetector } from '../../../detector';
import { openWindowsFileDialog } from '../../window-launcher';

const logger = new Logger('FactusolController');

export class FactusolController {

  public static openNativeFileDialog(agent?: LocalAgent): RouteHandler {
    return async (req, res, ctx) => {
      try {
        let initialPath = (ctx?.body && ctx.body.currentPath) || ctx?.parsedUrl?.searchParams?.get('currentPath') || undefined;

        if (initialPath) {
          const trimmed = String(initialPath).trim();
          const isUnc = /^\\\\|^\/\//.test(trimmed);
          if (isUnc && req.method === 'GET') {
            logger.warn(`Intento de fuga NTLM bloqueado en GET /open-file-dialog: "${trimmed}"`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Rutas UNC de red no permitidas en peticiones GET' }));
            return;
          }
          if (/[\x00-\x1f<>"|?*]/.test(trimmed)) {
            logger.warn(`Caracteres de control no válidos en ruta open-file-dialog: "${trimmed}"`);
            initialPath = undefined;
          } else {
            initialPath = trimmed;
          }
        }

        if (!initialPath && agent) {
          initialPath = agent.configManager?.get()?.factusolDbPath;
        }
        const filePath = await openWindowsFileDialog(
          'Seleccionar Base de Datos Factusol (Local o NAS / Red)',
          'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb',
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

  public static detectFactusol(agent?: LocalAgent): RouteHandler {
    return (_req, res) => {
      logger.info('Escaneando discos en busca de Factusol...');
      const additionalPaths: string[] = [];
      const currentPath = agent?.configManager?.get()?.factusolDbPath;
      if (currentPath) {
        try {
          const dir = path.dirname(currentPath);
          additionalPaths.push(dir);
          const parentDir = path.dirname(dir);
          additionalPaths.push(parentDir);
        } catch {}
      }
      const instances = FactusolDetector.detectAll(additionalPaths);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ instances }));
    };
  }

  public static testFactusol(agent: LocalAgent): RouteHandler {
    return async (_req, res, ctx) => {
      const dbPath = ctx.body?.databasePath || '';
      if (/[\x00-\x1f;]/.test(dbPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta de base de datos' }));
        return;
      }
      const t0 = performance.now();
      const result = await agent.testFactusolConnection(dbPath);
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...result, durationMs }));
    };
  }

  public static getMetadata(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const metadata = await agent.getFactusolMetadata();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metadata));
    };
  }

  public static getPreview(agent: LocalAgent): RouteHandler {
    return async (_req, res) => {
      const preview = await agent.getFactusolPreviewArticles(25);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(preview));
    };
  }

  public static resolvePath(agent: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      const inputPath = ctx.body?.path || '';
      if (/[\x00-\x1f]/.test(inputPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta' }));
        return;
      }
      const result = agent.resolveFactusolPath(inputPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
