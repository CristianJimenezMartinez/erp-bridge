export interface FactusolMetadata {
  tariffs: Array<{ code: string; name: string }>;
  warehouses: Array<{ code: string; name: string }>;
  series: string[];
  /** F9: database si proviene de Factusol; defaults si se devuelven valores por defecto (offline o error de lectura). */
  source?: 'database' | 'defaults';
  offline?: boolean;
}

export interface ArticlePreviewItem {
  code: string;
  description: string;
  family: string;
  costPrice: number;
  salePrice?: number;
  stock: number;
  ean: string;
}

/** F9: resultado de vista previa que distingue 'vacío' de 'offline' o 'error de lectura'. */
export interface ArticlePreviewResult {
  articles: ArticlePreviewItem[];
  total?: number;
  offline?: boolean;
  error?: string;
}

export interface PathResolutionResult {
  success: boolean;
  resolvedPath: string;
  isDirectory: boolean;
  message: string;
  candidates: string[];
}
