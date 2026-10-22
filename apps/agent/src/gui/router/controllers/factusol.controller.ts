import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { FactusolDetector } from '../../../detector';
import { FactusolPathResolver } from '../../../factusol';
import { openWindowsFileDialog } from '../../window-launcher';

const logger = new Logger('FactusolController');

export class FactusolController {

  public static openNativeFileDialog(agent?: LocalAgent): RouteHandler {
    return async (req, res, ctx) => {
      try {
        // Sincronizar unidades de red mapeadas (W:, X:, Y:, Z:) de HKCU\Network en la sesión actual
        FactusolDetector.syncMappedDrivesInSession();

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

        // Pasar SIEMPRE el directorio padre (nunca el nombre del archivo .accdb) para no bloquear la navegación por carpetas
        const initialDir = FactusolPathResolver.resolveDialogInitialDirectory(initialPath);

        const filePath = await openWindowsFileDialog(
          'Seleccionar Base de Datos Factusol (Local o NAS / Red)',
          'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb',
          initialDir
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (filePath) {
          // Persistir de inmediato en disco en AppData para que la ruta elegida no se pierda al cerrar y abrir
          if (agent?.configManager) {
            try {
              const current = agent.configManager.get();
              agent.configManager.update({
                factusolDbPath: filePath,
                factusol: {
                  ...(current.factusol || { tariffCode: '1', warehouseCode: 'GEN' }),
                  databasePath: filePath,
                },
              });
            } catch (persistErr) {
              logger.warn(`No se pudo persistir ruta seleccionada en config: ${String(persistErr)}`);
            }
          }
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
      const dbPath = (ctx.body?.databasePath || '').trim();
      if (/[\x00-\x1f;'"\x60]/.test(dbPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta de base de datos (; \' " ` o caracteres de control)' }));
        return;
      }
      if (dbPath && agent?.configManager) {
        try {
          const current = agent.configManager.get();
          const cleaned = FactusolPathResolver.cleanPath(dbPath);
          const resolved = FactusolPathResolver.resolve(cleaned);
          const finalPath = (resolved.success && resolved.resolvedPath) ? resolved.resolvedPath : cleaned;
          agent.configManager.update({
            factusolDbPath: finalPath,
            factusol: {
              ...(current.factusol || { tariffCode: '1', warehouseCode: 'GEN' }),
              databasePath: finalPath,
            },
          });
        } catch (err) {
          logger.warn(`No se pudo auto-persistir ruta en testFactusol: ${String(err)}`);
        }
      }
      const lic = agent.licenseService?.getLicenseStatus();
      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Licencia requerida: Activa tu clave de licencia en el Paso 1 o en la pestaña Licencia antes de conectar con Factusol.'
        }));
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
      const lic = agent.licenseService?.getLicenseStatus();
      if (lic && lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          articles: [],
          message: 'Licencia requerida para consultar el catálogo de Factusol.'
        }));
        return;
      }
      const preview = await agent.getFactusolPreviewArticles(25);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(preview));
    };
  }

  public static resolvePath(agent: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      const inputPath = (ctx.body?.path || '').trim();
      if (/[\x00-\x1f;'"\x60]/.test(inputPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Caracteres no válidos en la ruta (; \' " ` o caracteres de control)' }));
        return;
      }
      const result = agent.resolveFactusolPath(inputPath);
      const finalPath = (result.success && result.resolvedPath) ? result.resolvedPath : FactusolPathResolver.cleanPath(inputPath);
      if (finalPath && agent?.configManager) {
        try {
          const current = agent.configManager.get();
          agent.configManager.update({
            factusolDbPath: finalPath,
            factusol: {
              ...(current.factusol || { tariffCode: '1', warehouseCode: 'GEN' }),
              databasePath: finalPath,
            },
          });
        } catch (err) {
          logger.warn(`No se pudo auto-persistir ruta en resolvePath: ${String(err)}`);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    };
  }
}
