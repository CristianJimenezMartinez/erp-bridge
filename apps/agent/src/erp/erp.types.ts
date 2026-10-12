export type SupportedErpProviderId = 'factusol' | 'simplygest';

export interface ErpProviderConfigState {
  databasePath?: string;
  tariffCode?: string;
  warehouseCode?: string;
  orderSeries?: string;
  invoiceSeries?: string;
  saleTariffCode?: string;
  activeOnly?: boolean;
  [key: string]: any;
}

export interface SoftwareErpConfig {
  activeProvider: SupportedErpProviderId;
  provisioned: boolean;
  providers?: {
    factusol?: ErpProviderConfigState;
    simplygest?: ErpProviderConfigState;
    [key: string]: any;
  };
}

export interface ErpArticlePreviewItem {
  code: string;
  description: string;
  family?: string;
  stock: number;
  salePrice?: number;
  costPrice?: number;
  ean?: string;
}

export interface ErpTestResult {
  success: boolean;
  message: string;
  articleCount?: number;
  fileSizeBytes?: number;
  resolvedPath?: string;
}

export interface ErpOrderResult {
  success: boolean;
  orderNumber?: string | number;
  externalId?: string | number;
  error?: string;
}

export interface ErpCatalogArticle {
  code: string;
  name: string;
  family?: string;
  stock: number;
  price: number;
  costPrice?: number;
  barcode?: string;
  description?: string;
  raw?: any;
}

export interface ErpMetadata {
  tariffs: Array<{ code: string; name: string }>;
  warehouses: Array<{ code: string; name: string }>;
  series: string[];
}
