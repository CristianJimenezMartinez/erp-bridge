import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { FactusolDetector } from '../../../detector';
import { openWindowsFileDialog } from '../../window-launcher';

const logger = new Logger('FactusolController');

export class FactusolController {

  public static openNativeFileDialog(): RouteHandler {
    return (_req, res) => {
      try {
        const filePath = openWindowsFileDialog(
          'Seleccionar Base de Datos Factusol (Local o NAS / Red)',
          'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb'
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
      const result = await agent.testFactusolConnection(ctx.body.databasePath || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
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
      const result = agent.resolveFactusolPath(ctx.body.path || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
