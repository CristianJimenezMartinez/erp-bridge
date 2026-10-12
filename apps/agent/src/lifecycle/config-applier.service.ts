import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import {
  AgentFactusolSettings,
  AgentSimplyGestSettings,
  AgentWooCommerceSettings,
  AgentUniversalBridgeSettings,
  AgentShopifySettings,
  AgentPrestashopSettings,
  AgentHoldedSettings,
  AgentSyncRules,
  AgentNotificationSettings,
  ConfigManager,
} from '../config';
import { LicenseService } from '../license';
import { FactusolService, FactusolPathResolver } from '../factusol';
import { SoftwareErpConfig, ErpProviderRegistry } from '../erp';
import { SimplyGestService, SimplyGestDetector } from '../simplygest';
import { LocalSyncEngine } from '../sync';
import { EventBus } from '../diagnostics';
import { isSecretMaskedOrEmpty } from '../channels/channel-tester.service';

export interface FullConfigUpdates {
  erpType?: 'factusol' | 'simplygest';
  softwareErp?: SoftwareErpConfig;
  factusol?: AgentFactusolSettings;
  simplygest?: AgentSimplyGestSettings;
  woocommerce?: AgentWooCommerceSettings;
  universalBridge?: AgentUniversalBridgeSettings;
  shopify?: AgentShopifySettings;
  prestashop?: AgentPrestashopSettings;
  holded?: AgentHoldedSettings;
  channelType?: 'woocommerce' | 'universal_bridge' | 'shopify' | 'holded' | 'prestashop';
  syncRules?: AgentSyncRules;
  licenseKey?: string;
  notifications?: AgentNotificationSettings;
}

export class ConfigApplierService {
  private readonly logger = new Logger('ConfigApplierService');

  constructor(
    private readonly configManager: ConfigManager,
    private readonly licenseService: LicenseService,
    private readonly factusolService: FactusolService,
    private readonly syncEngine: LocalSyncEngine,
    private readonly eventBus: EventBus,
    private readonly simplygestService?: SimplyGestService,
    private readonly erpRegistry?: ErpProviderRegistry
  ) {}

  public async saveFullConfig(
    updates: FullConfigUpdates,
    isRunning: () => boolean
  ): Promise<{ success: boolean; message: string }> {
    const cfg = this.configManager.get();

    // Validación estricta anti-inyección de rutas de base de datos
    const invalidPathRegex = /[\x00-\x1f;'"\x60]/;
    const pathCandidates = [
      updates.factusol?.databasePath,
      updates.simplygest?.databasePath,
      updates.softwareErp?.providers?.factusol?.databasePath,
      updates.softwareErp?.providers?.simplygest?.databasePath,
    ];
    for (const p of pathCandidates) {
      if (typeof p === 'string' && invalidPathRegex.test(p)) {
        return {
          success: false,
          message: 'Ruta de base de datos no válida: contiene caracteres prohibidos (; \' " ` o caracteres de control).',
        };
      }
    }

    // Sincronización de softwareErp hacia factusol y simplygest
    if (updates.softwareErp?.providers?.factusol) {
      updates.factusol = { ...(updates.factusol || {}), ...updates.softwareErp.providers.factusol };
    }
    if (updates.softwareErp?.providers?.simplygest) {
      updates.simplygest = { ...(updates.simplygest || {}), ...updates.softwareErp.providers.simplygest };
    }

    if (updates.softwareErp?.activeProvider) {
      cfg.erpType = updates.softwareErp.activeProvider;
      if (this.erpRegistry) {
        this.erpRegistry.setActiveProvider(updates.softwareErp.activeProvider);
      }
    } else if (updates.erpType) {
      cfg.erpType = updates.erpType;
      if (this.erpRegistry) {
        this.erpRegistry.setActiveProvider(updates.erpType);
      }
    }
    if (updates.factusol) {
      cfg.factusol = { ...(cfg.factusol || {}), ...updates.factusol };
      if (updates.factusol.databasePath !== undefined) {
        const cleaned = FactusolPathResolver.cleanPath(updates.factusol.databasePath);
        const resolved = FactusolPathResolver.resolve(cleaned);
        const finalPath = (resolved.success && resolved.resolvedPath) ? resolved.resolvedPath : cleaned;
        cfg.factusolDbPath = finalPath;
        cfg.factusol.databasePath = finalPath;
        updates.factusol.databasePath = finalPath;
      }
    }
    if (updates.simplygest) {
      cfg.simplygest = { ...(cfg.simplygest || {}), ...updates.simplygest };
      if (updates.simplygest.databasePath !== undefined) {
        const cleaned = SimplyGestDetector.cleanPath(updates.simplygest.databasePath);
        const resolved = SimplyGestDetector.resolve(cleaned);
        const finalPath = (resolved.success && resolved.resolvedPath) ? resolved.resolvedPath : cleaned;
        cfg.simplygestDbPath = finalPath;
        cfg.simplygest.databasePath = finalPath;
        updates.simplygest.databasePath = finalPath;
      }
    }

    // Consolidación de softwareErp retrocompatible
    const finalActive = updates.softwareErp?.activeProvider || updates.erpType || cfg.softwareErp?.activeProvider || cfg.erpType || 'factusol';
    const isProvisioned = updates.softwareErp?.provisioned !== undefined
      ? updates.softwareErp.provisioned
      : (cfg.softwareErp?.provisioned !== undefined
        ? cfg.softwareErp.provisioned
        : Boolean(cfg.factusolDbPath || cfg.simplygestDbPath));

    cfg.erpType = finalActive;
    cfg.softwareErp = {
      activeProvider: finalActive,
      provisioned: isProvisioned,
      providers: {
        ...(cfg.softwareErp?.providers || {}),
        factusol: { ...(cfg.factusol || {}) },
        simplygest: { ...(cfg.simplygest || {}) },
      },
    };
    if (updates.woocommerce) {
      const existingSecret = cfg.woocommerce?.consumerSecret;
      cfg.woocommerce = { ...(cfg.woocommerce || {}), ...updates.woocommerce };
      if (isSecretMaskedOrEmpty(updates.woocommerce.consumerSecret) && existingSecret) {
        cfg.woocommerce.consumerSecret = existingSecret;
      }
    }
    if (updates.universalBridge) {
      const existingSecretKey = cfg.universalBridge?.secretKey;
      const existingDbPass = cfg.universalBridge?.dbPass;
      cfg.universalBridge = { ...(cfg.universalBridge || {}), ...updates.universalBridge };
      if (isSecretMaskedOrEmpty(updates.universalBridge.secretKey) && existingSecretKey) {
        cfg.universalBridge.secretKey = existingSecretKey;
      }
      if (isSecretMaskedOrEmpty(updates.universalBridge.dbPass) && existingDbPass) {
        cfg.universalBridge.dbPass = existingDbPass;
      }
    }
    if (updates.shopify) {
      const existingToken = cfg.shopify?.accessToken;
      cfg.shopify = { ...(cfg.shopify || {}), ...updates.shopify };
      if (isSecretMaskedOrEmpty(updates.shopify.accessToken) && existingToken) {
        cfg.shopify.accessToken = existingToken;
      }
    }
    if (updates.prestashop) {
      const existingApiKey = cfg.prestashop?.apiKey;
      cfg.prestashop = { ...(cfg.prestashop || {}), ...updates.prestashop };
      if (isSecretMaskedOrEmpty(updates.prestashop.apiKey) && existingApiKey && cfg.prestashop) {
        cfg.prestashop.apiKey = existingApiKey;
      }
    }
    if (updates.holded) {
      const existingApiKey = cfg.holded?.apiKey;
      cfg.holded = { ...(cfg.holded || {}), ...updates.holded };
      if (isSecretMaskedOrEmpty(updates.holded.apiKey) && existingApiKey && cfg.holded) {
        cfg.holded.apiKey = existingApiKey;
      }
    }
    if (updates.channelType) {
      cfg.channelType = updates.channelType;
    }
    if (updates.syncRules) {
      cfg.syncRules = { ...(cfg.syncRules || {}), ...updates.syncRules };
    }
    if (updates.notifications) {
      const existingSmtpPass = cfg.notifications?.smtpPass;
      cfg.notifications = { ...(cfg.notifications || {}), ...updates.notifications };
      if (isSecretMaskedOrEmpty(updates.notifications.smtpPass) && existingSmtpPass) {
        cfg.notifications.smtpPass = existingSmtpPass;
      }
    }

    let licenseMsg = '';
    if (updates.licenseKey && updates.licenseKey !== cfg.licenseKey && !isSecretMaskedOrEmpty(updates.licenseKey)) {
      const licRes = await this.licenseService.activateLicense(updates.licenseKey);
      if (!licRes.success) {
        licenseMsg = ` (Aviso en licencia: ${licRes.error})`;
      } else {
        cfg.licenseKey = updates.licenseKey;
        licenseMsg = ' (Licencia activada con éxito)';
      }
    }

    const saveRes = this.configManager.saveConfigToDisk();
    if (!saveRes.success) {
      this.eventBus.addEvent('error', `✕ Fallo al guardar en disco: ${saveRes.error}`);
      return {
        success: false,
        message: `Error al persistir la configuración en disco: ${saveRes.error}. Comprueba los permisos de acceso.`,
      };
    }

    this.syncEngine.startAutoSyncLoop(isRunning);

    if (cfg.erpType === 'simplygest') {
      await this.factusolService.disconnect().catch(() => null);
      if (cfg.simplygestDbPath) {
        let activeSgPath = cfg.simplygestDbPath;
        if (!fs.existsSync(activeSgPath)) {
          const resolved = SimplyGestDetector.resolve(activeSgPath);
          if (resolved.success && resolved.resolvedPath) activeSgPath = resolved.resolvedPath;
        }
        if (fs.existsSync(activeSgPath)) {
          await this.simplygestService?.connect(activeSgPath).catch(() => null);
        } else {
          this.logger.warn(`Ruta de SimplyGest guardada pero no accesible inmediatamente (Desconectado/Offline): ${cfg.simplygestDbPath}`);
        }
      }
    } else if (cfg.erpType === 'factusol' && cfg.factusolDbPath) {
      if (this.simplygestService) {
        await this.simplygestService.disconnect().catch(() => null);
      }
      let activePath = cfg.factusolDbPath;
      if (!fs.existsSync(activePath)) {
        const unc = FactusolPathResolver.resolveMappedDriveToUnc(activePath);
        if (unc && fs.existsSync(unc)) activePath = unc;
      }
      if (fs.existsSync(activePath)) {
        await this.factusolService.reconnect(activePath).catch(() => null);
      } else {
        this.logger.warn(`Ruta de Factusol guardada pero no accesible inmediatamente (Desconectado/Offline): ${cfg.factusolDbPath}`);
      }
    }

    this.eventBus.addEvent('success', `✓ Configuración guardada en disco (${path.basename(saveRes.filePath)})${licenseMsg}`);
    return { success: true, message: `Configuración guardada correctamente en disco${licenseMsg}` };
  }
}
