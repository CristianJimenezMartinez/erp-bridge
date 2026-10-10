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

export interface AgentShopifySettings {
  shopSubdomain?: string;
  accessToken?: string;
  locationId?: string;
  apiVersion?: string;
}

export interface AgentHoldedSettings {
  apiKey?: string;
  defaultWarehouseId?: string;
  endpointUrl?: string;
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

export interface AgentNotificationSettings {
  // Email (SMTP Propio - BYO SMTP)
  orderAlertsEnabled?: boolean;
  alertEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  smtpSecure?: boolean;

  // Telegram Bot
  telegramAlertsEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;

  // Discord Webhook
  discordAlertsEnabled?: boolean;
  discordWebhookUrl?: string;
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
  shopify?: AgentShopifySettings;
  holded?: AgentHoldedSettings;
  channelType?: 'woocommerce' | 'universal_bridge' | 'shopify' | 'holded';
  syncRules?: AgentSyncRules;
  notifications?: AgentNotificationSettings;
}

