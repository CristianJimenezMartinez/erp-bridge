import http from 'http';
import { Logger } from '@erp-bridge/shared';
import { LocalAgent } from '../agent';
import { FactusolDetector } from '../detector';
import { renderDashboardHtml } from './ui-template';
import { openWindowsFileDialog } from './window-launcher';

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

            // 6. Save Configuration & Reconnect
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

            // 7. Activate License
            if (pathname === '/api/local/activate-license' && req.method === 'POST') {
              const body = await readRequestBody(req);
              const result = await this.agent.activateLicense(body.licenseKey || '');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 8. Manual Sync Trigger
            if (pathname === '/api/local/sync-now' && req.method === 'POST') {
              const result = await this.agent.triggerManualSync();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              return;
            }

            // 9. Activity Logs
            if (pathname === '/api/local/logs' && req.method === 'GET') {
              const logs = this.agent.getRecentEvents();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(logs));
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
