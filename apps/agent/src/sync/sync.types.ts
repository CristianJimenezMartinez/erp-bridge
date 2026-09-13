export interface SyncManualResult {
  success: boolean;
  message: string;
}

export interface CatalogUploadResult {
  success: boolean;
  totalArticles: number;
  uploadedCount: number;
  skippedCount: number;
  failedCount: number;
  message: string;
}

