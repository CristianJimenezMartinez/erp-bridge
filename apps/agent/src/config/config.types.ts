export interface AgentFactusolSettings {
  databasePath?: string;
  tariffCode?: string;
  saleTariffCode?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  warehouseCode?: string;
  activeOnly?: boolean;
}

export interface AgentWooCommerceSettings {
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
  orderStatusMapping?: Record<string, string>;
}

export interface AgentUniversalBridgeSettings {
  storeUrl?: string;
  secretKey?: string;
  dbName?: string;
  dbUser?: string;
  dbPass?: string;
  enabled?: boolean;
}

export interface AgentSyncRules {
  enableFileWatcher?: boolean;
  debounceSeconds?: number;
  periodicIntervalMinutes?: number;
  syncStock?: boolean;
  syncPrices?: boolean;
  syncDescriptions?: boolean;
  onlyStockAboveZero?: boolean;
  safetyStockBuffer?: number;
}

export interface AgentConfigFile {
  agentId?: string;
  agentName?: string;
  agentVersion?: string;
  authToken?: string;
  apiBaseUrl?: string;
  organizationId?: string;
  factusolDbPath?: string;
  heartbeatIntervalMs?: number;
  licenseKey?: string;
  factusol?: AgentFactusolSettings;
  woocommerce?: AgentWooCommerceSettings;
  universalBridge?: AgentUniversalBridgeSettings;
  channelType?: 'woocommerce' | 'universal_bridge';
  syncRules?: AgentSyncRules;
}
