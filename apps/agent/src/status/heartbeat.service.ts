import { performance } from 'perf_hooks';
import { Logger, AgentHeartbeatPayload } from '@erp-bridge/shared';
import { ConfigManager } from '../config';
import { LicenseService } from '../license';
import { FactusolService } from '../factusol';
import { FileWatcherService } from '../sync';
import { SystemInfoService, AgentDiskLogger } from '../diagnostics';

export interface HeartbeatOptions {
  configManager: ConfigManager;
  licenseService: LicenseService;
  factusolService: FactusolService;
  fileWatcherService: FileWatcherService;
  onUpdateDetected?: (updateInfo: any) => void;
  isUpdating?: () => boolean;
}

export class HeartbeatService {
  private readonly logger = new Logger('HeartbeatService');
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly configManager: ConfigManager;
  private readonly licenseService: LicenseService;
  private readonly factusolService: FactusolService;
  private readonly fileWatcherService: FileWatcherService;
  private readonly onUpdateDetected?: (updateInfo: any) => void;
  private readonly isUpdating?: () => boolean;

  constructor(options: HeartbeatOptions) {
    this.configManager = options.configManager;
    this.licenseService = options.licenseService;
    this.factusolService = options.factusolService;
    this.fileWatcherService = options.fileWatcherService;
    this.onUpdateDetected = options.onUpdateDetected;
    this.isUpdating = options.isUpdating;
  }

  public start(isRunning: () => boolean): void {
    const sendBeat = async () => {
      if (!isRunning()) return;
      const cfg = this.configManager.get();
      const hwid = await this.licenseService.getHWID().catch(() => 'unknown_hwid');
      const effectiveAgentId = cfg.agentId || `ag_${hwid.substring(0, 16)}`;

      try {
        let factusolHealth: any;
        const connector = this.factusolService.getConnector();
        if (connector) {
          const check = await connector.healthCheck();
          const count = await this.factusolService.getArticleCount(cfg.factusolDbPath).catch(() => undefined);
          factusolHealth = {
            status: check.status,
            latencyMs: check.latencyMs,
            databasePath: cfg.factusolDbPath,
            message: check.message,
            articleCount: count,
          };
        }

        const heartbeat: AgentHeartbeatPayload & Record<string, any> = {
          agentId: effectiveAgentId,
          hwid,
          version: this.configManager.getVersion(),
          status: 'ONLINE',
          systemInfo: SystemInfoService.getSystemInfo(),
          factusolHealth,
          fileWatcherActive: this.fileWatcherService.isActive(),
          channelInfo: {
            channelType: cfg.channelType || (cfg.universalBridge?.storeUrl ? 'universal_bridge' : 'woocommerce'),
            storeUrl: cfg.universalBridge?.storeUrl || cfg.woocommerce?.storeUrl || '',
          },
        };

        if (cfg.apiBaseUrl) {
          const tBeatNetStart = performance.now();
          const res = await fetch(`${cfg.apiBaseUrl}/api/v1/agents/${effectiveAgentId}/heartbeat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cfg.authToken ? { Authorization: `Bearer ${cfg.authToken}` } : {}),
            },
            body: JSON.stringify(heartbeat),
          }).catch(() => null);
          const beatLatencyMs = Math.round(performance.now() - tBeatNetStart);

          AgentDiskLogger.getInstance().log({
            level: res && res.ok ? 'INFO' : 'WARN',
            component: 'Heartbeat',
            action: 'send_heartbeat',
            duration_ms: beatLatencyMs,
            status: res && res.ok ? 'SUCCESS' : 'FAILURE',
            message: res && res.ok
              ? `Latido Heartbeat enviado a ${cfg.apiBaseUrl} en ${beatLatencyMs}ms (HTTP ${res.status})`
              : `Aviso en latido Heartbeat al Core tras ${beatLatencyMs}ms (${res ? `HTTP ${res.status}` : 'Sin respuesta de red'})`,
            metadata: {
              agentId: effectiveAgentId,
              apiBaseUrl: cfg.apiBaseUrl,
              factusolStatus: factusolHealth?.status,
              factusolLatencyMs: factusolHealth?.latencyMs,
              articleCount: factusolHealth?.articleCount,
              fileWatcherActive: this.fileWatcherService.isActive(),
            },
          });

          if (res && res.ok) {
            try {
              const resJson = (await res.json()) as {
                data?: {
                  updateAvailable?: boolean;
                  targetVersion?: string;
                  updateInfo?: any;
                };
              };
              const updating = this.isUpdating ? this.isUpdating() : false;
              if (resJson.data?.updateAvailable && !updating) {
                this.logger.info(`🔥 Nueva versión detectada en latido Heartbeat: v${resJson.data.targetVersion}`);
                if (this.onUpdateDetected) {
                  this.onUpdateDetected(resJson.data.updateInfo || { version: resJson.data.targetVersion! });
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        this.logger.warn('Fallo al emitir heartbeat al Core', { err: String(err) });
      }
    };

    void sendBeat();
    const cfg = this.configManager.get();
    this.heartbeatTimer = setInterval(sendBeat, cfg.heartbeatIntervalMs || 30000);
  }

  public stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
