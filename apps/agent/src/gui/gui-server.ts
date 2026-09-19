import http from 'http';
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
} from './router/controllers';

const logger = new Logger('LocalGuiServer');

export class LocalGuiServer {
  private server: http.Server | null = null;
  private activePort: number;
  private router: MiniRouter;
  private readonly sockets = new Set<Socket>();

  constructor(
    private readonly agent: LocalAgent,
    private readonly defaultPort: number = 39281
  ) {
    this.activePort = this.defaultPort;
    this.router = this.buildRouter();
    this.agent.setGuiServer(this);
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
    router.any(['GET', 'POST'], '/api/local/open-file-dialog', FactusolController.openNativeFileDialog());
    router.any(['GET', 'POST'], '/api/local/fs/browse', FactusolController.browseDirectory(this.agent));
    router.post('/api/local/detect-factusol', FactusolController.detectFactusol(this.agent));
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
    router.post('/api/local/upload-catalog', SyncController.uploadCatalog(this.agent));

    // 6. License
    router.post('/api/local/activate-license', LicenseController.activateLicense(this.agent));

    // 7. System & Config
    router.get('/api/local/autostart', SystemController.getAutoStart(this.agent));
    router.post('/api/local/autostart', SystemController.setAutoStart(this.agent));
    router.post('/api/local/save-full-config', SystemController.saveFullConfig(this.agent));
    router.post('/api/local/save-config', SystemController.saveConfig(this.agent));
    router.any(['GET', 'POST'], '/api/local/check-update', SystemController.checkUpdate(this.agent));
    router.post('/api/local/apply-update', SystemController.applyUpdate(this.agent));
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

        srv.on('connection', (socket: Socket) => {
          this.sockets.add(socket);
          socket.on('close', () => {
            this.sockets.delete(socket);
          });
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
