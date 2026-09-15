import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '@erp-bridge/shared';
import { AgentConfigFile } from './config.types';

export class ConfigManager {
  private readonly logger = new Logger('ConfigManager');
  private configFilePath: string;
  private currentVersion: string;
  private config: AgentConfigFile;

  constructor(customConfig?: Partial<AgentConfigFile>) {
    const appDirConfig = path.join(path.dirname(process.execPath), 'agent-config.json');
    const cwdConfig = path.join(process.cwd(), 'agent-config.json');
    this.configFilePath = fs.existsSync(appDirConfig) ? appDirConfig : cwdConfig;

    const diskConfig = this.loadConfigFromDisk();

    let pkgVersion = '0.2.0';
    try {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      if (fs.existsSync(pkgPath)) {
        pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '0.2.0';
      }
    } catch {}

    const compiledVersion = (typeof process !== 'undefined' && (process.env.APP_VERSION || process.env.AGENT_VERSION))
      ? (process.env.APP_VERSION || process.env.AGENT_VERSION)
      : pkgVersion;
    this.currentVersion = customConfig?.agentVersion || compiledVersion || diskConfig.agentVersion || pkgVersion;

    const diskFactusol = diskConfig.factusol || {};
    const diskWoo = diskConfig.woocommerce || {};
    const diskSync = diskConfig.syncRules || {};

    this.config = {
      agentName: customConfig?.agentName || diskConfig.agentName || os.hostname() || 'Windows Agent',
      agentVersion: this.currentVersion,
      apiBaseUrl: customConfig?.apiBaseUrl || diskConfig.apiBaseUrl || 'https://bridge.cristianjm.com',
      organizationId: customConfig?.organizationId || diskConfig.organizationId || 'org_default',
      agentId: customConfig?.agentId || diskConfig.agentId,
      authToken: customConfig?.authToken || diskConfig.authToken,
      factusolDbPath: customConfig?.factusolDbPath || diskConfig.factusolDbPath || diskFactusol.databasePath,
      heartbeatIntervalMs: customConfig?.heartbeatIntervalMs || diskConfig.heartbeatIntervalMs || 30000,
      licenseKey: customConfig?.licenseKey || diskConfig.licenseKey,
      channelType: customConfig?.channelType || diskConfig.channelType || 'woocommerce',
      universalBridge: customConfig?.universalBridge || diskConfig.universalBridge,
      factusol: {
        databasePath: customConfig?.factusolDbPath || customConfig?.factusol?.databasePath || diskConfig.factusolDbPath || diskFactusol.databasePath || '',
        tariffCode: customConfig?.factusol?.tariffCode || diskFactusol.tariffCode || '1',
        orderSeries: customConfig?.factusol?.orderSeries || diskFactusol.orderSeries || '1',
        invoiceSeries: customConfig?.factusol?.invoiceSeries || diskFactusol.invoiceSeries || '1',
        warehouseCode: customConfig?.factusol?.warehouseCode || diskFactusol.warehouseCode || 'GEN',
        activeOnly: customConfig?.factusol?.activeOnly ?? (diskFactusol.activeOnly !== false),
      },
      woocommerce: {
        storeUrl: customConfig?.woocommerce?.storeUrl || diskWoo.storeUrl || '',
        consumerKey: customConfig?.woocommerce?.consumerKey || diskWoo.consumerKey || '',
        consumerSecret: customConfig?.woocommerce?.consumerSecret || diskWoo.consumerSecret || '',
        orderStatusMapping: customConfig?.woocommerce?.orderStatusMapping || diskWoo.orderStatusMapping || {
          pending: 'pedido',
          processing: 'albaran',
          completed: 'factura',
        },
      },
      syncRules: {
        enableFileWatcher: diskSync.enableFileWatcher !== false,
        debounceSeconds: diskSync.debounceSeconds ?? 5,
        periodicIntervalMinutes: diskSync.periodicIntervalMinutes ?? 15,
        syncStock: diskSync.syncStock !== false,
        syncPrices: diskSync.syncPrices !== false,
        syncDescriptions: diskSync.syncDescriptions === true,
        onlyStockAboveZero: diskSync.onlyStockAboveZero === true,
        safetyStockBuffer: diskSync.safetyStockBuffer ?? 0,
      },
    };
  }

  public get(): AgentConfigFile {
    return this.config;
  }

  public getConfig(): Readonly<AgentConfigFile> {
    return { ...this.config };
  }

  public getVersion(): string {
    return this.currentVersion;
  }

  public getConfigFilePath(): string {
    return this.configFilePath;
  }

  public getAppDir(): string {
    return path.dirname(this.configFilePath);
  }

  public setApiBaseUrl(url: string): void {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    this.config.apiBaseUrl = cleanUrl;
    this.saveConfigToDisk();
    this.logger.info(`✓ URL del servidor API actualizada a: ${cleanUrl}`);
  }

  public setFactusolDbPath(dbPath: string): void {
    const resolved = path.resolve(dbPath.trim());
    if (!fs.existsSync(resolved)) {
      throw new Error(`El archivo de base de datos Factusol no existe: ${resolved}`);
    }
    this.config.factusolDbPath = resolved;
    if (this.config.factusol) {
      this.config.factusol.databasePath = resolved;
    }
    this.saveConfigToDisk();
    this.logger.info(`✓ Base de datos Factusol configurada en: ${resolved}`);
  }

  public setLicenseKey(key?: string): void {
    this.config.licenseKey = key;
    this.saveConfigToDisk();
  }

  public update(partial: Partial<AgentConfigFile>): void {
    Object.assign(this.config, partial);
    this.saveConfigToDisk();
  }

  public loadConfigFromDisk(): AgentConfigFile {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8').replace(/^\uFEFF/, '');
        return JSON.parse(raw) as AgentConfigFile;
      }
    } catch {}
    return {};
  }

  public saveConfigToDisk(): void {
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
      this.logger.debug(`Configuración guardada en ${this.configFilePath}`);
    } catch (err) {
      this.logger.warn(`No se pudo persistir la configuración en disco: ${String(err)}`);
    }
  }
}
