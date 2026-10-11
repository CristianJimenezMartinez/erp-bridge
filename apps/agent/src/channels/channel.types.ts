export interface WooCommerceTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  storeName?: string;
  productCount?: number;
}

export interface UniversalBridgeChecklist {
  serverOnline: boolean;
  sslValid: boolean;
  endpointFound: boolean;
  databaseReady: boolean;
}

export interface UniversalBridgeTestResult {
  success: boolean;
  message: string;
  checks: UniversalBridgeChecklist;
  details?: {
    httpStatus?: number;
    url?: string;
    protocol?: string;
    serverSoftware?: string;
    version?: string;
    articlesInShop?: number;
    dbName?: string;
    dbError?: string;
  };
}

export interface ShopifyLocation {
  id: string;
  name: string;
}

export interface ShopifyTestSettings {
  shopSubdomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyTestResult {
  success: boolean;
  message: string;
  locations?: ShopifyLocation[];
  durationMs?: number;
  shopName?: string;
  myshopifyDomain?: string;
}

export interface PrestashopChecklist {
  serverOnline: boolean;
  sslValid: boolean;
  apiActive: boolean;
  permissionsOk: boolean;
}

export interface PrestashopTestSettings {
  storeUrl: string;
  apiKey: string;
}

export interface PrestashopTestResult {
  success: boolean;
  message: string;
  storeName?: string;
  version?: string;
  latencyMs?: number;
  statusCode?: number;
  checks?: PrestashopChecklist;
}

