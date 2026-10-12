export interface SimplyGestDetectedInstance {
  databasePath: string;
  companyName?: string;
  fileSizeBytes?: number;
  lastModified?: string;
}

export interface SimplyGestArticlePreviewItem {
  code: string;
  description: string;
  family?: string;
  stock: number;
  salePrice?: number;
  costPrice?: number;
  ean?: string;
}

export interface SimplyGestTestResult {
  success: boolean;
  message: string;
  articleCount?: number;
  fileSizeBytes?: number;
  resolvedPath?: string;
}
