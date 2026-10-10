import { HoldedClient } from '@erp-bridge/connector-holded';
import { ConfigManager } from '../config';
import {
  WooCommerceTestResult,
  UniversalBridgeTestResult,
  ShopifyTestResult,
} from './channel.types';
import { WooCommerceTester } from './woocommerce.tester';
import { UniversalBridgeTester } from './universal-bridge.tester';
import { ShopifyTester } from './shopify.tester';

export const SECRET_MASK = '••••••••';
export function isSecretMaskedOrEmpty(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return true;
  const str = String(val).trim();
  return str === SECRET_MASK || /^[•*]{4,}$/.test(str);
}

export class ChannelTesterService {
  constructor(private readonly configManager: ConfigManager) {}

  public async testWooCommerceConnection(settings: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }): Promise<WooCommerceTestResult> {
    const cfg = this.configManager.get();
    let finalSecret = settings.consumerSecret;
    if (isSecretMaskedOrEmpty(finalSecret) && cfg.woocommerce?.consumerSecret) {
      finalSecret = cfg.woocommerce.consumerSecret;
    }
    return WooCommerceTester.test({ ...settings, consumerSecret: finalSecret });
  }

  public async testUniversalBridge(settings: {
    storeUrl: string;
    secretKey?: string;
  }): Promise<UniversalBridgeTestResult> {
    const cfg = this.configManager.get();
    let finalKey = settings.secretKey;
    if (isSecretMaskedOrEmpty(finalKey) && cfg.universalBridge?.secretKey) {
      finalKey = cfg.universalBridge.secretKey;
    }
    return UniversalBridgeTester.test({ ...settings, secretKey: finalKey });
  }

  public async testShopifyConnection(settings: {
    shopSubdomain: string;
    accessToken: string;
    apiVersion?: string;
  }): Promise<ShopifyTestResult> {
    const cfg = this.configManager.get();
    const finalToken =
      isSecretMaskedOrEmpty(settings.accessToken) && cfg.shopify?.accessToken
        ? cfg.shopify.accessToken
        : settings.accessToken;
    return ShopifyTester.test({ ...settings, accessToken: finalToken });
  }

  public async testHoldedConnection(config: {
    apiKey: string;
    defaultWarehouseId?: string;
  }): Promise<{ success: boolean; latencyMs: number; message?: string }> {
    const cfg = this.configManager.get();
    const finalApiKey =
      isSecretMaskedOrEmpty(config?.apiKey) && cfg.holded?.apiKey
        ? cfg.holded.apiKey
        : config?.apiKey;
    if (!finalApiKey || isSecretMaskedOrEmpty(finalApiKey)) {
      return { success: false, latencyMs: 0, message: 'La API Key de Holded no puede estar vacía.' };
    }
    try {
      const client = new HoldedClient({
        apiKey: finalApiKey.trim(),
        defaultWarehouseId: config?.defaultWarehouseId?.trim() || cfg.holded?.defaultWarehouseId,
      });
      const result = await client.testConnection();
      return {
        success: result.success,
        latencyMs: result.latencyMs,
        message: result.success
          ? `Conexión con Holded Cloud verificada correctamente (${result.latencyMs} ms).`
          : 'No se pudo conectar con la API de Holded. Verifica tu API Key.',
      };
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: `Error al conectar con Holded: ${err?.message || String(err)}` };
    }
  }
}
