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
