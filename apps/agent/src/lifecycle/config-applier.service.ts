import fs from 'fs';
import path from 'path';
import { Logger } from '@erp-bridge/shared';
import {
  AgentFactusolSettings,
  AgentWooCommerceSettings,
  AgentUniversalBridgeSettings,
  AgentShopifySettings,
  AgentHoldedSettings,
  AgentSyncRules,
  AgentNotificationSettings,
  ConfigManager,
} from '../config';
import { LicenseService } from '../license';
import { FactusolService, FactusolPathResolver } from '../factusol';
import { LocalSyncEngine } from '../sync';
import { EventBus } from '../diagnostics';
import { isSecretMaskedOrEmpty } from '../channels/channel-tester.service';

export interface FullConfigUpdates {
  factusol?: AgentFactusolSettings;
  woocommerce?: AgentWooCommerceSettings;
  universalBridge?: AgentUniversalBridgeSettings;
  shopify?: AgentShopifySettings;
  holded?: AgentHoldedSettings;
  channelType?: 'woocommerce' | 'universal_bridge' | 'shopify' | 'holded';
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
    private readonly eventBus: EventBus
  ) {}

  public async saveFullConfig(
    updates: FullConfigUpdates,
    isRunning: () => boolean
  ): Promise<{ success: boolean; message: string }> {
    const cfg = this.configManager.get();
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

    if (cfg.factusolDbPath) {
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
