import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { FactusolDetector } from '../../../detector';
import { openWindowsFileDialog } from '../../window-launcher';

const logger = new Logger('FactusolController');

export class FactusolController {
  public static browseFactusol(): RouteHandler {
    return (_req, res) => {
      logger.info('Abriendo diálogo nativo de Windows para seleccionar base de datos Factusol...');
      const selected = openWindowsFileDialog(
        'Seleccione el archivo de base de datos Factusol (FS.accdb o F_XXX.accdb)',
        'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb|Todos los archivos (*.*)|*.*'
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ selectedPath: selected || null }));
    };
  }

  public static detectFactusol(): RouteHandler {
    return (_req, res) => {
      logger.info('Escaneando discos en busca de Factusol...');
      const instances = FactusolDetector.detectAll();
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
