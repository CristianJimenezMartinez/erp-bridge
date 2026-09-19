import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '@erp-bridge/shared';
import { AgentConfigFile } from './config.types';

export class ConfigManager {
  private readonly logger = new Logger('ConfigManager');
  private configFilePath: string;
  private secondaryConfigFilePath?: string;
  private currentVersion: string;
  private config: AgentConfigFile;

  constructor(customConfig?: Partial<AgentConfigFile>) {
    // 1. Determinar ubicaciones de configuración (primaria siempre escribible, secundaria para migración)
    const { primaryPath, secondaryPath } = ConfigManager.resolveConfigFilePaths();
    this.configFilePath = primaryPath;
    this.secondaryConfigFilePath = secondaryPath;

    // 2. Cargar configuración existente en disco (con migración si procede)
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
    const rawDbPath = (customConfig?.factusolDbPath || customConfig?.factusol?.databasePath || diskConfig.factusolDbPath || diskFactusol.databasePath || '').trim();

    this.config = {
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
    if (process.env.BENTIAN_DATA_DIR) {
      return { 
        primaryPath: path.join(process.env.BENTIAN_DATA_DIR, 'agent-config.json'),
        secondaryPath: process.env.BENTIAN_LEGACY_CONFIG_PATH
      };
    }
    if (process.env.BENTIAN_CONFIG_PATH) {
      return { 
        primaryPath: process.env.BENTIAN_CONFIG_PATH,
        secondaryPath: process.env.BENTIAN_LEGACY_CONFIG_PATH
      };
    }

    const appData = process.env.APPDATA || (process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support')
      : path.join(os.homedir(), '.config'));

    const userBentianDir = path.join(appData, 'Bentian Agent');
    const userConfigPath = path.join(userBentianDir, 'agent-config.json');

    const exeDir = path.dirname(process.execPath);
    const exeConfigPath = path.join(exeDir, 'agent-config.json');
    const cwdConfigPath = path.join(process.cwd(), 'agent-config.json');

    const isProgramFiles = /Program Files/i.test(exeDir) || /Windows/i.test(exeDir);
    const isPortable = fs.existsSync(path.join(exeDir, '.portable'));

    if (isPortable) {
      return { primaryPath: exeConfigPath, secondaryPath: userConfigPath };
    }

    if (!isProgramFiles && ConfigManager.isDirWritable(exeDir)) {
      if (fs.existsSync(userConfigPath)) {
        return { primaryPath: userConfigPath, secondaryPath: exeConfigPath };
      }
      return { primaryPath: exeConfigPath, secondaryPath: userConfigPath };
    }

    // Instalación normal en Windows (C:\Program Files\Bentian Agent):
    // La ubicación primaria SIEMPRE debe ser AppData (100% escribible sin permisos de administrador)
    return {
      primaryPath: userConfigPath,
      secondaryPath: fs.existsSync(exeConfigPath) ? exeConfigPath : (fs.existsSync(cwdConfigPath) ? cwdConfigPath : undefined)
    };
  }

  private static isDirWritable(dir: string): boolean {
    try {
      if (!fs.existsSync(dir)) return false;
      const testFile = path.join(dir, `.bentian-test-${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
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
    // 1. Intentar cargar desde ubicación primaria
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8').replace(/^\uFEFF/, '');
        const parsed = JSON.parse(raw) as AgentConfigFile;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (err) {
      this.logger.warn(`Aviso al leer configuración de ${this.configFilePath}: ${String(err)}`);
    }

    // 2. Fallback a ubicación secundaria (ej: Program Files de versiones previas)
    if (this.secondaryConfigFilePath && this.secondaryConfigFilePath !== this.configFilePath) {
      try {
        if (fs.existsSync(this.secondaryConfigFilePath)) {
          const raw = fs.readFileSync(this.secondaryConfigFilePath, 'utf8').replace(/^\uFEFF/, '');
          const parsed = JSON.parse(raw) as AgentConfigFile;
          if (parsed && typeof parsed === 'object') {
            this.logger.info(`✓ Configuración migrada desde ubicación previa: ${this.secondaryConfigFilePath} -> ${this.configFilePath}`);
            return parsed;
          }
        }
      } catch (err) {
        this.logger.warn(`Aviso al leer configuración secundaria: ${String(err)}`);
      }
    }

    // 3. Fallback a CWD (solo si no se especificó una ruta explícita por variable de entorno)
    if (!process.env.BENTIAN_CONFIG_PATH) {
      const cwdConfig = path.join(process.cwd(), 'agent-config.json');
      if (cwdConfig !== this.configFilePath && cwdConfig !== this.secondaryConfigFilePath) {
        try {
          if (fs.existsSync(cwdConfig)) {
            const raw = fs.readFileSync(cwdConfig, 'utf8').replace(/^\uFEFF/, '');
            const parsed = JSON.parse(raw) as AgentConfigFile;
            if (parsed && typeof parsed === 'object') {
              return parsed;
            }
          }
        } catch {}
      }
    }

    return {};
  }

  public saveConfigToDisk(): { success: boolean; filePath: string; error?: string } {
    try {
      const dir = path.dirname(this.configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempFile = `${this.configFilePath}.tmp.${Date.now()}`;
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(tempFile, content, 'utf8');

      if (fs.existsSync(this.configFilePath)) {
        try {
          fs.unlinkSync(this.configFilePath);
        } catch {}
      }
      fs.renameSync(tempFile, this.configFilePath);

      this.logger.info(`✓ Configuración guardada en disco: ${this.configFilePath}`);

      // Intentar espejo en la ubicación secundaria si es escribible
      if (this.secondaryConfigFilePath && this.secondaryConfigFilePath !== this.configFilePath) {
        try {
          fs.writeFileSync(this.secondaryConfigFilePath, content, 'utf8');
        } catch {}
      }

      return { success: true, filePath: this.configFilePath };
    } catch (err) {
      const msg = `Error al persistir configuración en ${this.configFilePath}: ${String(err)}`;
      this.logger.error(msg);
      return { success: false, filePath: this.configFilePath, error: String(err) };
    }
  }
}
