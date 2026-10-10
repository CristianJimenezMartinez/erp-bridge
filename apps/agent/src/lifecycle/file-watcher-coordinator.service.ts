import { performance } from 'perf_hooks';
import { Logger } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { LicenseService } from '../license';
import { LocalSyncEngine } from '../sync';
import { EventBus, AgentDiskLogger } from '../diagnostics';

export class FileWatcherCoordinatorService {
  private readonly logger = new Logger('FileWatcherCoordinator');

  constructor(
    private readonly configManager: ConfigManager,
    private readonly licenseService: LicenseService,
    private readonly syncEngine: LocalSyncEngine,
    private readonly eventBus: EventBus
  ) {}

  public async handleFileWatcherChange(reason: string): Promise<void> {
    const cfg = this.configManager.get();
    this.logger.info(`Cambio detectado en base Factusol (${reason}). Disparando sincronización de stock autónoma...`);
    this.eventBus.addEvent('info', `Cambio detectado en Factusol (${reason}). Sincronizando stock...`);
    AgentDiskLogger.getInstance().log({
      level: 'INFO',
      component: 'FileWatcher',
      action: 'file_change_detected',
      duration_ms: 0,
      status: 'SUCCESS',
      message: `Cambio en Factusol detectado por vigilante en tiempo real (${reason}). Sincronizando stock...`,
      metadata: { reason, databasePath: cfg.factusolDbPath },
    });

    const lic = this.licenseService.getLicenseStatus();
    if (lic.status !== 'VALID' && lic.status !== 'GRACE_PERIOD') {
      return;
    }

    if (!this.syncEngine.isBusy()) {
      void this.syncEngine.triggerManualSync(false);
    }
    if (cfg.agentId && cfg.apiBaseUrl) {
      const tNotify = performance.now();
      await fetch(`${cfg.apiBaseUrl}/api/v1/sync/run-reactive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {}),
        },
        body: JSON.stringify({
          agentId: cfg.agentId,
          organizationId: cfg.organizationId,
          reason,
          timestamp: new Date().toISOString(),
        }),
      })
        .then((res) => {
          const dur = Math.round(performance.now() - tNotify);
          AgentDiskLogger.getInstance().log({
            level: res.ok ? 'DEBUG' : 'WARN',
            component: 'FileWatcher',
            action: 'notify_reactive_sync',
            duration_ms: dur,
            status: res.ok ? 'SUCCESS' : 'FAILURE',
            message: `Notificación de sincronización reactiva a la API (${dur}ms, HTTP ${res.status})`,
          });
        })
        .catch((err) => {
          this.logger.warn(`No se pudo notificar sync reactivo a la API: ${err instanceof Error ? err.message : String(err)}`);
        });
    }
  }
}
