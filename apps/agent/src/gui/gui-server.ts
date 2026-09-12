import http from 'http';
import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import { LocalAgent } from '../agent';
import { FactusolDetector } from '../detector';
import { renderDashboardHtml } from './ui-template';
import { openWindowsFileDialog, openDesktopWindow } from './window-launcher';

const logger = new Logger('LocalGuiServer');

function readRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export class LocalGuiServer {
  private server: http.Server | null = null;
  private activePort: number;

  constructor(
    private readonly agent: LocalAgent,
    private readonly defaultPort: number = 39281
  ) {
    this.activePort = this.defaultPort;
  }

  public async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      const tryListen = (portToTry: number) => {
        const srv = http.createServer(async (req, res) => {
          // CORS headers for loopback
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }

          const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
          const pathname = parsedUrl.pathname;

          try {
            // 1. UI Entrypoint
            if (pathname === '/' || pathname === '/index.html') {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(renderDashboardHtml());
              return;
            }

            // 2. Status
            if (pathname === '/api/local/status' && req.method === 'GET') {
              const status = await this.agent.getStatusDetails();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(status));
              return;
            }

            // 3. Browse Factusol (Windows File Dialog)
            if (pathname === '/api/local/browse-factusol' && req.method === 'POST') {
              logger.info('Abriendo diálogo nativo de Windows para seleccionar base de datos Factusol...');
              const selected = openWindowsFileDialog(
                'Seleccione el archivo de base de datos Factusol (FS.accdb o F_XXX.accdb)',
                'Bases de datos Factusol (*.accdb;*.mdb)|*.accdb;*.mdb|Todos los archivos (*.*)|*.*'
              );
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ selectedPath: selected || null }));
              return;
            }

            // 4. Auto-detect Factusol
            if (pathname === '/api/local/detect-factusol' && req.method === 'POST') {
              logger.info('Escaneando discos en busca de Factusol...');
              const instances = FactusolDetector.detectAll();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ instances }));
              return;
            }

            // 5. Test Factusol connection
            if (pathname === '/api/local/test-factusol' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.testFactusolConnection(body.databasePath || '');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 6. Save Full Configuration
            if (pathname === '/api/local/save-full-config' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.saveFullConfig(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // Legacy Save Configuration fallback
            if (pathname === '/api/local/save-config' && req.method === 'POST') {
              const body = await readRequestBody(req);
              let success = true;
              let message = 'Configuración actualizada con éxito.';

              if (body.factusolDbPath) {
                const rec = await this.agent.reconnectFactusol(body.factusolDbPath);
                if (!rec.success) {
                  success = false;
                  message = rec.message;
                }
              }

              if (body.licenseKey) {
                const licRes = await this.agent.activateLicense(body.licenseKey);
                if (!licRes.success) {
                  success = false;
                  message = `Error en licencia: ${licRes.error}`;
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success, message }));
              return;
            }

            // 7. Factusol Metadata (Tariffs, Warehouses, Series)
            if (pathname === '/api/local/factusol/metadata' && req.method === 'GET') {
              const metadata = await this.agent.getFactusolMetadata();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(metadata));
              return;
            }

            // 8. Factusol Preview Articles
            if (pathname === '/api/local/factusol/preview' && req.method === 'GET') {
              const preview = await this.agent.getFactusolPreviewArticles(25);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(preview));
              return;
            }

            // 9. Test WooCommerce Connection
            if (pathname === '/api/local/test-woocommerce' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.testWooCommerceConnection(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 9.1 Test Universal Web Bridge (Cualquier web / Hosting)
            if (pathname === '/api/local/test-universal-bridge' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.testUniversalBridge(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 9.2 Resolve Factusol Folder / Path Heuristically
            if (pathname === '/api/local/resolve-factusol-path' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = this.agent.resolveFactusolPath(body.path || '');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 9.3 Download Universal Companion PHP Script
            if (pathname === '/api/local/download-companion' && req.method === 'GET') {
              const secret = parsedUrl.searchParams.get('secretKey') || ('EB_SEC_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12));
              const dbName = parsedUrl.searchParams.get('dbName') || '';
              const dbUser = parsedUrl.searchParams.get('dbUser') || '';
              const dbPass = parsedUrl.searchParams.get('dbPass') || '';

              let phpTemplate = '';
              const candidatePaths = [
                path.resolve(__dirname, '../../../../packages/connectors/universal-bridge/erp-bridge-endpoint.php'),
                path.resolve(process.cwd(), 'packages/connectors/universal-bridge/erp-bridge-endpoint.php'),
                path.resolve(__dirname, 'erp-bridge-endpoint.php'),
              ];
              for (const p of candidatePaths) {
                if (fs.existsSync(p)) {
                  phpTemplate = fs.readFileSync(p, 'utf-8');
                  break;
                }
              }

              if (!phpTemplate) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Plantilla erp-bridge-endpoint.php no encontrada' }));
                return;
              }

              let customized = phpTemplate.replace(/%%EB_SECRET_KEY%%/g, secret);
              if (dbName) customized = customized.replace(/%%EB_DB_NAME%%/g, dbName);
              if (dbUser) customized = customized.replace(/%%EB_DB_USER%%/g, dbUser);
              if (dbPass) customized = customized.replace(/%%EB_DB_PASS%%/g, dbPass);

              res.writeHead(200, {
                'Content-Type': 'application/x-php; charset=utf-8',
                'Content-Disposition': 'attachment; filename="erp-bridge-endpoint.php"',
              });
              res.end(customized);
              return;
            }

            // 10. Sync History & Executions
            if (pathname === '/api/local/history' && req.method === 'GET') {
              const history = this.agent.getSyncHistory();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(history));
              return;
            }

            // 11. Export Diagnostics
            if (pathname === '/api/local/export-diagnostic' && req.method === 'GET') {
              const diagnosticText = this.agent.exportDiagnostic();
              res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="bentian-diagnostics.txt"',
              });
              res.end(diagnosticText);
              return;
            }

            // 12. Activate License
            if (pathname === '/api/local/activate-license' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.activateLicense(body.licenseKey || '');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 13. Manual Sync Trigger
            if (pathname === '/api/local/sync-now' && req.method === 'POST') {
              const result = await this.agent.triggerManualSync();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 14. Activity Logs
            if (pathname === '/api/local/logs' && req.method === 'GET') {
              const logs = this.agent.getRecentEvents();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(logs));
              return;
            }

            // 15. Open Desktop Window (called from System Tray)
            if (pathname === '/api/local/open-window' && (req.method === 'GET' || req.method === 'POST')) {
              logger.info('Solicitud de apertura de ventana recibida desde System Tray.');
              const opened = openDesktopWindow(this.getUrl());
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: opened, url: this.getUrl() }));
              return;
            }

            // 16. Graceful Shutdown (called from System Tray)
            if (pathname === '/api/local/shutdown' && req.method === 'POST') {
              logger.info('Solicitud de apagado del agente recibida desde System Tray.');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Apagando Bentian Agent...' }));

              setTimeout(async () => {
                try {
                  await this.stop();
                  await this.agent.stop();
                } catch { }
                process.exit(0);
              }, 300);
              return;
            }

            // 404 Fallback
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
          } catch (err) {
            logger.error('Error procesando petición en servidor GUI local:', { err: String(err) });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          }
        });

        srv.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            logger.warn(`Puerto ${portToTry} ocupado. Intentando siguiente puerto disponible...`);
            if (portToTry === this.defaultPort) {
              tryListen(this.defaultPort + 1);
            } else {
              tryListen(0); // Dynamic available port
            }
          } else {
            reject(err);
          }
        });

        srv.listen(portToTry, '127.0.0.1', () => {
          const addr = srv.address();
          const port = typeof addr === 'object' && addr ? addr.port : portToTry;
          this.activePort = port;
          this.server = srv;
          const url = `http://127.0.0.1:${port}`;
          logger.info(`✓ Servidor de interfaz gráfica local escuchando en: ${url}`);
          resolve({ port, url });
        });
      };

      tryListen(this.defaultPort);
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }

  public getUrl(): string {
    return `http://127.0.0.1:${this.activePort}`;
  }
}
