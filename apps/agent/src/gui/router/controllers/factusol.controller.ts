import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { RouteHandler } from '../mini-router';
import { LocalAgent } from '../../../agent';
import { FactusolDetector } from '../../../detector';

const logger = new Logger('FactusolController');

export class FactusolController {
  public static browseDirectory(agent?: LocalAgent): RouteHandler {
    return (_req, res, ctx) => {
      try {
        let targetPath: string = ctx.parsedUrl?.searchParams?.get('path') || ctx.body?.path || '';

        if (!targetPath) {
          const cfg = agent?.configManager?.get();
          const currentDb = cfg?.factusol?.databasePath || cfg?.factusolDbPath;
          if (currentDb && fs.existsSync(currentDb)) {
            targetPath = fs.statSync(currentDb).isDirectory() ? currentDb : path.dirname(currentDb);
          } else if (fs.existsSync('C:\\Software DELSOL\\Factusol\\Datos\\FS')) {
            targetPath = 'C:\\Software DELSOL\\Factusol\\Datos\\FS';
          } else if (fs.existsSync('C:\\Software DELSOL\\Factusol\\Datos')) {
            targetPath = 'C:\\Software DELSOL\\Factusol\\Datos';
          } else {
            targetPath = 'C:\\';
          }
        }

        // Obtener unidades disponibles en Windows
        const drives: Array<{ label: string; path: string }> = [];
        const driveLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'Z', 'Y', 'X'];
        for (const dl of driveLetters) {
          const rootPath = `${dl}:\\`;
          try {
            if (fs.existsSync(rootPath)) {
              drives.push({ label: `Disco ${dl}:`, path: rootPath });
            }
          } catch {}
        }

        // Atajos útiles de Factusol
        const shortcuts: Array<{ label: string; path: string }> = [];
        if (fs.existsSync('C:\\Software DELSOL\\Factusol\\Datos\\FS')) {
          shortcuts.push({ label: '📂 Factusol / Datos / FS', path: 'C:\\Software DELSOL\\Factusol\\Datos\\FS' });
        }
        const userHome = process.env['USERPROFILE'] || process.env['HOME'];
        if (userHome) {
          const docs = path.join(userHome, 'Documents');
          if (fs.existsSync(docs)) shortcuts.push({ label: '🏠 Documentos', path: docs });
          const desktop = path.join(userHome, 'Desktop');
          if (fs.existsSync(desktop)) shortcuts.push({ label: '🖥️ Escritorio', path: desktop });
        }

        const items: Array<{
          name: string;
          fullPath: string;
          isDirectory: boolean;
          isDatabase: boolean;
          sizeBytes?: number;
          mtime?: string;
        }> = [];

        if (fs.existsSync(targetPath)) {
          const stat = fs.statSync(targetPath);
          const dirToList = stat.isDirectory() ? targetPath : path.dirname(targetPath);
          targetPath = dirToList;

          const entries = fs.readdirSync(dirToList, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('$') || entry.name.startsWith('~$') || entry.name === 'System Volume Information') continue;
            const full = path.join(dirToList, entry.name);
            const isDir = entry.isDirectory();
            const ext = path.extname(entry.name).toLowerCase();
            const isDb = !isDir && (ext === '.accdb' || ext === '.mdb');

            let sizeBytes: number | undefined;
            let mtime: string | undefined;
            if (isDb) {
              try {
                const st = fs.statSync(full);
                sizeBytes = st.size;
                mtime = st.mtime.toLocaleDateString('es-ES');
              } catch {}
            }

            if (isDir || isDb) {
              items.push({
                name: entry.name,
                fullPath: full,
                isDirectory: isDir,
                isDatabase: isDb,
                sizeBytes,
                mtime,
              });
            }
          }
        }

        items.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        });

        const parentPath = path.dirname(targetPath) !== targetPath ? path.dirname(targetPath) : null;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          currentPath: targetPath,
          parentPath,
          drives,
          shortcuts,
          items,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: String(err) }));
      }
    };
  }

  public static browseFactusol(): RouteHandler {
    return (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, useExplorerModal: true }));
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
