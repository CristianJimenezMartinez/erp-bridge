export interface FactusolMetadata {
  tariffs: Array<{ code: string; name: string }>;
  warehouses: Array<{ code: string; name: string }>;
  series: string[];
}

export interface ArticlePreviewItem {
  code: string;
  description: string;
  family: string;
  costPrice: number;
  stock: number;
  ean: string;
}

export interface PathResolutionResult {
  success: boolean;
  resolvedPath: string;
  isDirectory: boolean;
  message: string;
  candidates: string[];
}
