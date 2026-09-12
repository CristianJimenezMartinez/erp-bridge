import { Logger } from '@erp-bridge/shared';
import { AccdbFileWatcher } from '@erp-bridge/core';

export class FileWatcherService {
  private readonly logger = new Logger('FileWatcherService');
  private watcher: AccdbFileWatcher | null = null;

  public start(filePath: string, organizationId: string, onSync: (reason: string) => Promise<void>): void {
    this.stop();
    this.watcher = new AccdbFileWatcher({
      filePath,
      organizationId,
      debounceMs: 5000,
    });

    this.watcher.onSync(onSync);
    this.watcher.start();
    this.logger.info(`Watcher iniciado para Factusol: ${filePath} (Debounce: 5000ms)`);
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
      this.logger.info('Watcher detenido.');
    }
  }

  public isActive(): boolean {
    return this.watcher !== null;
  }
}
