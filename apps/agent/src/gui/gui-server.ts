import http from 'http';
import crypto from 'crypto';
import { Socket } from 'net';
import { Logger } from '@erp-bridge/shared';
import { LocalAgent } from '../agent';
import { MiniRouter } from './router/mini-router';
import {
  StatusController,
  FactusolController,
  ChannelController,
  SyncController,
  LicenseController,
  SystemController,
  SalesOrdersController,
} from './router/controllers';

const logger = new Logger('LocalGuiServer');

export class LocalGuiServer {
  private server: http.Server | null = null;
  private activePort: number;
  private router: MiniRouter;
  private readonly sockets = new Set<Socket>();
  private readonly localToken: string;

  constructor(
    private readonly agent: LocalAgent,
    private readonly defaultPort: number = 39281
  ) {
    this.localToken = crypto.randomBytes(32).toString('hex');
    this.activePort = this.defaultPort;
    this.router = this.buildRouter();
    this.agent.setGuiServer(this);
  }

  public getLocalToken(): string {
    return this.localToken;
  }

  private buildRouter(): MiniRouter {
    const router = new MiniRouter(this.localToken);

    // 1. UI Entrypoint
    router.get('/', SystemController.renderIndex(this.agent, () => this.localToken));
    router.get('/index.html', SystemController.renderIndex(this.agent, () => this.localToken));

    // 2. Status & Logs
    router.get('/api/local/status', StatusController.getStatus(this.agent));
    router.get('/api/local/logs', StatusController.getLogs(this.agent));
    router.get('/api/local/logs/structured', StatusController.getStructuredLogs());
    router.get('/api/local/export-diagnostic', StatusController.exportDiagnostic(this.agent));
    router.get('/api/local/preflight', StatusController.getPreflight(this.agent));
    router.get('/api/local/diagnostics', StatusController.getLiveHealth(this.agent));
    router.get('/api/local/live-health', StatusController.getLiveHealth(this.agent));

    // Endpoints estándar v1 (diagnóstico en vivo y salud)
    router.get('/v1/status', StatusController.getStatus(this.agent));
    router.get('/v1/diagnostics', StatusController.getLiveHealth(this.agent));
    router.get('/v1/live-health', StatusController.getLiveHealth(this.agent));
    router.get('/v1/logs/structured', StatusController.getStructuredLogs());

    // Health check rápido de disponibilidad de instancia (CLI & Updaters)
    const handleHealthCheck = (_req: any, res: any) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'OK', agentVersion: this.agent.getVersion() }));
    };
    router.get('/health', handleHealthCheck);
    router.get('/api/local/health', handleHealthCheck);

    // 3. Factusol
    router.any(['GET', 'POST'], '/api/local/open-file-dialog', FactusolController.openNativeFileDialog(this.agent));
    router.any(['GET', 'POST'], '/api/local/browse-factusol-db', FactusolController.openNativeFileDialog(this.agent));
    router.post('/api/local/detect-factusol', FactusolController.detectFactusol(this.agent));
    router.post('/api/local/test-factusol', FactusolController.testFactusol(this.agent));
    router.get('/api/local/factusol/metadata', FactusolController.getMetadata(this.agent));
    router.get('/api/local/factusol/preview', FactusolController.getPreview(this.agent));
    router.post('/api/local/resolve-factusol-path', FactusolController.resolvePath(this.agent));

    // 4. Channels
    router.post('/api/local/test-woocommerce', ChannelController.testWooCommerce(this.agent));
    router.post('/api/local/test-universal-bridge', ChannelController.testUniversalBridge(this.agent));
    router.post('/api/local/test-shopify', ChannelController.testShopify(this.agent));
    router.post('/api/local/channel/test-holded', ChannelController.testHolded(this.agent));
    router.post('/api/local/test-holded', ChannelController.testHolded(this.agent));
    router.get('/api/local/download-companion', ChannelController.downloadCompanion());

    // 5. Sync & History
    router.get('/api/local/history', SyncController.getHistory(this.agent));
    router.post('/api/local/sync-now', SyncController.syncNow(this.agent));
    router.post('/api/local/upload-catalog', SyncController.uploadCatalog(this.agent));
    router.get('/api/local/sales-orders', SalesOrdersController.getOrders(this.agent));
    router.get('/api/local/sales-orders/:id', SalesOrdersController.getOrderById(this.agent));
    router.post('/api/local/sales-orders/:id/retry', SalesOrdersController.retryOrder(this.agent));

    // 6. License
    router.post('/api/local/activate-license', LicenseController.activateLicense(this.agent));

    // 7. System & Config
    router.get('/api/local/autostart', SystemController.getAutoStart(this.agent));
    router.post('/api/local/autostart', SystemController.setAutoStart(this.agent));
    router.post('/api/local/save-full-config', SystemController.saveFullConfig(this.agent));
    router.post('/api/local/test-email', SystemController.testEmail(this.agent));
    router.post('/api/local/report-incident', SystemController.reportIncident(this.agent));
    router.any(['GET', 'POST'], '/api/local/check-update', SystemController.checkUpdate(this.agent));
    router.post('/api/local/apply-update', SystemController.applyUpdate(this.agent));
    router.any(['GET', 'POST'], '/api/local/open-window', SystemController.openWindow(() => this.getUrl()));
    router.any(['GET', 'POST'], '/api/local/open-gui', SystemController.openWindow(() => this.getUrl()));
    router.post('/api/local/shutdown', SystemController.shutdown(this.agent, () => this.stop()));

    // 8. Visual Identity, Favicon & Web App Manifest (Barra de tareas e icono de ventana)
    router.get('/favicon.ico', SystemController.serveFavicon());
    router.get('/manifest.json', SystemController.serveManifest());
    router.get('/api/local/icon', SystemController.serveIcon());

    return router;
  }

  public async start(): Promise<{ port: number; url: string }> {
    const fixedPort = this.defaultPort; // 39281 estricto e inmutable
    const maxRetries = 12; // Resiliencia ampliada contra TIME_WAIT en reinicios / updates (hasta ~15-20s)
    const baseDelayMs = 500;

    return new Promise((resolve, reject) => {
      let attempt = 0;

      const attemptListen = () => {
        attempt++;
        const srv = http.createServer((req, res) => {
          this.router.handle(req, res);
        });

        srv.on('connection', (socket: Socket) => {
          this.sockets.add(socket);
          socket.on('close', () => {
            this.sockets.delete(socket);
          });
        });

        srv.once('error', (err: NodeJS.ErrnoException) => {
          try {
            srv.close();
          } catch {}

          if (err.code === 'EADDRINUSE') {
            if (attempt <= maxRetries) {
              const currentDelay = Math.min(2500, Math.round(baseDelayMs * Math.pow(1.25, attempt - 1)));
              logger.info(`Puerto ${fixedPort} en uso/TIME_WAIT (intento ${attempt}/${maxRetries}). Reintentando en ${currentDelay}ms...`);
              setTimeout(attemptListen, currentDelay);
              return;
            }
            logger.error(`Puerto ${fixedPort} ocupado tras ${maxRetries} intentos. Prohibido saltar de puerto.`);
            reject(new Error(`Puerto ${fixedPort} bloqueado por otro proceso tras ${maxRetries} intentos.`));
          } else {
            reject(err);
          }
        });

        srv.listen(fixedPort, '127.0.0.1', () => {
          this.activePort = fixedPort;
          this.server = srv;
          const url = `http://127.0.0.1:${fixedPort}`;
          logger.info(`✓ Servidor de interfaz gráfica local escuchando en puerto blindado: ${url}`);
          resolve({ port: fixedPort, url });
        });
      };

      attemptListen();
    });
  }

  public async stop(): Promise<void> {
    this.agent.setGuiServer(null);

    if (this.server) {
      const srv = this.server;
      this.server = null;

      // Close idle connections first if supported (Node.js 18.2+)
      if (typeof (srv as any).closeIdleConnections === 'function') {
        (srv as any).closeIdleConnections();
      }

      // Close active connections if supported (Node.js 18.2+)
      if (typeof (srv as any).closeAllConnections === 'function') {
        (srv as any).closeAllConnections();
      }

      // Forcefully destroy remaining sockets to avoid keep-alive hangs
      for (const socket of this.sockets) {
        if (!socket.destroyed) {
          socket.destroy();
        }
      }
      this.sockets.clear();

      return new Promise<void>((resolve) => {
        srv.close(() => {
          resolve();
        });
      });
    }
  }

  public getUrl(): string {
    return `http://127.0.0.1:${this.activePort}`;
  }
}
