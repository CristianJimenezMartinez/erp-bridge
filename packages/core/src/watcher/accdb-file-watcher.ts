import fs from 'fs';
import { Logger } from '@erp-bridge/shared';
import { EventBus } from '../events';

export interface AccdbFileWatcherConfig {
  filePath: string;
  organizationId?: string;
  pollingIntervalMs?: number; // Intervalo para fs.watchFile (default 5000ms)
  debounceMs?: number;        // Tiempo de calma tras último cambio antes de ejecutar (default 5000ms)
  minIntervalMs?: number;     // Intervalo mínimo entre ejecuciones completadas (default 15000ms)
}

export interface WatcherStatus {
  isWatching: boolean;
  filePath: string;
  isRunning: boolean;
  isPending: boolean;
  lastChangeDetectedAt: Date | null;
  lastExecutedAt: Date | null;
  totalTriggers: number;
}

export class AccdbFileWatcher {
  private readonly logger = new Logger('AccdbFileWatcher');
  private isWatching = false;
  private isRunning = false;
  private pending = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRunAt = 0;
  private lastChangeDetectedAt: Date | null = null;
  private lastExecutedAt: Date | null = null;
  private totalTriggers = 0;

  private onSyncCallback?: (reason: string) => Promise<void>;

  constructor(
    private readonly config: AccdbFileWatcherConfig,
    private readonly eventBus: EventBus = EventBus.getInstance()
  ) {}

  public onSync(callback: (reason: string) => Promise<void>): void {
    this.onSyncCallback = callback;
  }

  public start(): void {
    if (this.isWatching) {
      this.logger.warn(`Watcher ya activo para el archivo: ${this.config.filePath}`);
      return;
    }

    if (!fs.existsSync(this.config.filePath)) {
      this.logger.warn(`El archivo .accdb a vigilar no existe en disco: ${this.config.filePath}`);
    }

    const pollingInterval = this.config.pollingIntervalMs || 5000;

    fs.watchFile(this.config.filePath, { interval: pollingInterval }, (curr, prev) => {
      if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
        this.lastChangeDetectedAt = new Date();
        this.totalTriggers++;
        this.logger.info(`♻️ Cambio detectado en el archivo Factusol: ${this.config.filePath} (mtime modificado)`);

        this.eventBus.publish({
          type: 'FILE_CHANGE_DETECTED',
          organizationId: this.config.organizationId || 'default',
          source: 'AccdbFileWatcher',
          data: {
            filePath: this.config.filePath,
            size: curr.size,
            mtime: curr.mtime,
          },
        }).catch(() => {});

        this.scheduleSync('file-changed');
      }
    });

    this.isWatching = true;
    this.logger.info(`Watcher iniciado para Factusol: ${this.config.filePath} (Intervalo: ${pollingInterval}ms)`);
  }

  public stop(): void {
    if (!this.isWatching) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    fs.unwatchFile(this.config.filePath);
    this.isWatching = false;
    this.logger.info(`Watcher detenido para: ${this.config.filePath}`);
  }

  public scheduleSync(triggerReason = 'manual-trigger'): void {
    const debounceMs = this.config.debounceMs ?? 5000;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.runOnce(triggerReason).catch((err) => {
        this.logger.error(`Error en ejecución reactiva de sync (${triggerReason})`, err);
      });
    }, debounceMs);
  }

  private async runOnce(reason: string): Promise<void> {
    if (this.isRunning) {
      this.pending = true;
      this.logger.debug(`Ejecución en curso. Marcando ejecución pendiente tras calma (${reason})`);
      return;
    }

    const now = Date.now();
    const minIntervalMs = this.config.minIntervalMs ?? 15000;
    const diff = now - this.lastRunAt;

    if (diff < minIntervalMs) {
      const wait = minIntervalMs - diff;
      this.logger.debug(`Rate limit alcanzado. Postergando ejecución ${wait}ms (${reason})`);
      setTimeout(() => {
        this.runOnce(`${reason}|rate-limit`).catch((err) => {
          this.logger.error('Error en ejecución diferida por rate limit', err);
        });
      }, wait);
      return;
    }

    this.isRunning = true;
    try {
      this.logger.info(`Ejecutando sincronización reactiva de stock: [${reason}]`);
      if (this.onSyncCallback) {
        await this.onSyncCallback(reason);
      }
      this.lastExecutedAt = new Date();
    } finally {
      this.lastRunAt = Date.now();
      this.isRunning = false;

      if (this.pending) {
        this.pending = false;
        this.runOnce('pending-flush').catch((err) => {
          this.logger.error('Error al procesar cola de flush pendiente', err);
        });
      }
    }
  }

  public getStatus(): WatcherStatus {
    return {
      isWatching: this.isWatching,
      filePath: this.config.filePath,
      isRunning: this.isRunning,
      isPending: this.pending,
      lastChangeDetectedAt: this.lastChangeDetectedAt,
      lastExecutedAt: this.lastExecutedAt,
      totalTriggers: this.totalTriggers,
    };
  }
}
