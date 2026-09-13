import http from 'http';
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
} from './router/controllers';

const logger = new Logger('LocalGuiServer');

export class LocalGuiServer {
  private server: http.Server | null = null;
  private activePort: number;
  private router: MiniRouter;

  constructor(
    private readonly agent: LocalAgent,
    private readonly defaultPort: number = 39281
  ) {
    this.activePort = this.defaultPort;
    this.router = this.buildRouter();
  }

  private buildRouter(): MiniRouter {
    const router = new MiniRouter();

    // 1. UI Entrypoint
    router.get('/', SystemController.renderIndex(this.agent));
    router.get('/index.html', SystemController.renderIndex(this.agent));

    // 2. Status & Logs
    router.get('/api/local/status', StatusController.getStatus(this.agent));
    router.get('/api/local/logs', StatusController.getLogs(this.agent));
    router.get('/api/local/export-diagnostic', StatusController.exportDiagnostic(this.agent));

    // 3. Factusol
    router.post('/api/local/browse-factusol', FactusolController.browseFactusol());
    router.post('/api/local/detect-factusol', FactusolController.detectFactusol());
    router.post('/api/local/test-factusol', FactusolController.testFactusol(this.agent));
    router.get('/api/local/factusol/metadata', FactusolController.getMetadata(this.agent));
    router.get('/api/local/factusol/preview', FactusolController.getPreview(this.agent));
    router.post('/api/local/resolve-factusol-path', FactusolController.resolvePath(this.agent));

    // 4. Channels
    router.post('/api/local/test-woocommerce', ChannelController.testWooCommerce(this.agent));
    router.post('/api/local/test-universal-bridge', ChannelController.testUniversalBridge(this.agent));
    router.get('/api/local/download-companion', ChannelController.downloadCompanion());

    // 5. Sync & History
    router.get('/api/local/history', SyncController.getHistory(this.agent));
    router.post('/api/local/sync-now', SyncController.syncNow(this.agent));

    // 6. License
    router.post('/api/local/activate-license', LicenseController.activateLicense(this.agent));

    // 7. System & Config
    router.post('/api/local/save-full-config', SystemController.saveFullConfig(this.agent));
    router.post('/api/local/save-config', SystemController.saveConfig(this.agent));
    router.any(['GET', 'POST'], '/api/local/open-window', SystemController.openWindow(() => this.getUrl()));
    router.any(['GET', 'POST'], '/api/local/open-gui', SystemController.openWindow(() => this.getUrl()));
    router.post('/api/local/shutdown', SystemController.shutdown(this.agent, () => this.stop()));

    return router;
  }

  public async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      const tryListen = (portToTry: number) => {
        const srv = http.createServer((req, res) => {
          this.router.handle(req, res);
        });

        srv.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            logger.warn(`Puerto ${portToTry} ocupado. Intentando siguiente puerto disponible...`);
            if (portToTry === this.defaultPort) {
              tryListen(this.defaultPort + 1);
            } else {
              tryListen(0);
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
