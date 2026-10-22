import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '@erp-bridge/shared';
import { AgentConfigFile } from './config.types';
import {
  readConfigFromDiskWithMigration,
  resolveAgentConfigPaths,
  writeConfigAtomicallyToDisk,
} from './config-storage.helper';

export class ConfigManager {
  private readonly logger = new Logger('ConfigManager');
  private configFilePath: string;
  private secondaryConfigFilePath?: string;
  private currentVersion: string;
  private config: AgentConfigFile;

  constructor(customConfig?: Partial<AgentConfigFile>) {
    // 1. Determinar ubicaciones de configuración (primaria siempre escribible en AppData, secundaria para migración)
    const { primaryPath, secondaryPath } = ConfigManager.resolveConfigFilePaths();
    this.configFilePath = primaryPath;
    this.secondaryConfigFilePath = secondaryPath;

    // 2. Cargar configuración existente en disco (con desencriptado transparente y migración si procede)
    const diskConfig = this.loadConfigFromDisk();

    // 3. Determinar versión del agente
    let pkgVersion = '0.2.7';
    try {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      if (fs.existsSync(pkgPath)) {
        pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '0.2.7';
      }
    } catch {}

    const compiledVersion = (typeof process !== 'undefined' && (process.env.APP_VERSION || process.env.AGENT_VERSION))
      ? (process.env.APP_VERSION || process.env.AGENT_VERSION)
      : pkgVersion;
    this.currentVersion = customConfig?.agentVersion || compiledVersion || diskConfig.agentVersion || pkgVersion;

    const diskFactusol = diskConfig.factusol || {};
    const diskWoo = diskConfig.woocommerce || {};
    const diskUniv = diskConfig.universalBridge || {};
    const diskSync = diskConfig.syncRules || {};

    const rawAgentName = customConfig?.agentName || diskConfig.agentName || '';
    const resolvedAgentName = (rawAgentName && rawAgentName !== 'Telkkalas') ? rawAgentName : (os.hostname() || 'Windows Agent');

    // NUNCA descartar una ruta configurada por el usuario (en NAS, red local \\NAS\... o unidades mapeadas Z:\)
    // aunque fs.existsSync falle transitoriamente en el arranque mientras la red conecta.
    const rawDbPath = (
      customConfig?.factusolDbPath ||
      customConfig?.factusol?.databasePath ||
      diskConfig.factusolDbPath ||
      diskFactusol.databasePath ||
      ''
    ).trim();

    this.config = {
      ...diskConfig,
      agentName: resolvedAgentName,
      agentVersion: this.currentVersion,
      apiBaseUrl: customConfig?.apiBaseUrl || diskConfig.apiBaseUrl || 'https://bridge.cristianjm.com',
      organizationId: customConfig?.organizationId || diskConfig.organizationId || 'org_default',
      agentId: customConfig?.agentId || diskConfig.agentId,
      authToken: customConfig?.authToken || diskConfig.authToken,
      factusolDbPath: rawDbPath,
      heartbeatIntervalMs: customConfig?.heartbeatIntervalMs || diskConfig.heartbeatIntervalMs || 30000,
      licenseKey: customConfig?.licenseKey || diskConfig.licenseKey,
      channelType: customConfig?.channelType || diskConfig.channelType || 'universal_bridge',
      universalBridge: {
        ...diskUniv,
        storeUrl: customConfig?.universalBridge?.storeUrl || diskUniv.storeUrl || '',
        secretKey: customConfig?.universalBridge?.secretKey || diskUniv.secretKey || '',
        enabled: customConfig?.universalBridge?.enabled ?? (diskUniv.enabled !== false),
      },
      factusol: {
        databasePath: rawDbPath,
        tariffCode: customConfig?.factusol?.tariffCode || diskFactusol.tariffCode || '1',
        saleTariffCode: customConfig?.factusol?.saleTariffCode ?? diskFactusol.saleTariffCode ?? '',
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
        enableFileWatcher: customConfig?.syncRules?.enableFileWatcher ?? (diskSync.enableFileWatcher !== false),
        debounceSeconds: customConfig?.syncRules?.debounceSeconds ?? diskSync.debounceSeconds ?? 5,
        periodicIntervalMinutes: customConfig?.syncRules?.periodicIntervalMinutes ?? diskSync.periodicIntervalMinutes ?? 15,
        syncStock: customConfig?.syncRules?.syncStock ?? (diskSync.syncStock !== false),
        syncPrices: customConfig?.syncRules?.syncPrices ?? (diskSync.syncPrices !== false),
        syncDescriptions: customConfig?.syncRules?.syncDescriptions ?? (diskSync.syncDescriptions === true),
        onlyStockAboveZero: customConfig?.syncRules?.onlyStockAboveZero ?? (diskSync.onlyStockAboveZero === true),
        safetyStockBuffer: customConfig?.syncRules?.safetyStockBuffer ?? diskSync.safetyStockBuffer ?? 0,
      },
    };

    // Si la configuración primaria aún no existía en disco pero se leyó de una secundaria, consolidarla de inmediato
    if (!fs.existsSync(this.configFilePath) && Object.keys(diskConfig).length > 0) {
      this.saveConfigToDisk();
    }
  }

  public static resolveConfigFilePaths(): { primaryPath: string; secondaryPath?: string } {
    return resolveAgentConfigPaths();
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
    const clean = dbPath.trim().replace(/^["']|["']$/g, '');
    this.config.factusolDbPath = clean;
    if (this.config.factusol) {
      this.config.factusol.databasePath = clean;
    }
    const res = this.saveConfigToDisk();
    if (!res.success) {
      this.logger.error(`Error guardando configuración tras setFactusolDbPath: ${res.error}`);
    }
    this.logger.info(`✓ Base de datos Factusol configurada en: ${clean}`);
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
    return readConfigFromDiskWithMigration(this.configFilePath, this.secondaryConfigFilePath, this.logger);
  }

  public saveConfigToDisk(): { success: boolean; filePath: string; error?: string } {
    return writeConfigAtomicallyToDisk(this.configFilePath, this.config, this.logger);
  }
}
