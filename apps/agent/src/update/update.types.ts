import { UpdateChannel } from '@erp-bridge/shared';

/**
 * Estados del ciclo de vida del proceso de actualización en el agente.
 */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'applying'
  | 'success'
  | 'rollback'
  | 'failed';

/**
 * Opciones de configuración para el servicio de actualización del agente.
 */
export interface UpdateOptions {
  apiBaseUrl: string;
  agentId: string;
  currentVersion: string;
  channel?: UpdateChannel;
  checkIntervalMs?: number;
  autoDownload?: boolean;
  autoApply?: boolean;
  publicKeyPem?: string;
  hmacSecret?: string;
  tempDir?: string;
  backupDir?: string;
  targetBinaryPath?: string;
}

/**
 * Representa una actualización detectada y lista para descargar o aplicar.
 */
export interface PendingUpdate {
  version: string;
  downloadUrl: string;
  sha256: string;
  signature: string;
  fileSize?: number;
  releaseNotes?: string;
  mandatory?: boolean;
  channel?: UpdateChannel;
  downloadedFilePath?: string;
  downloadProgress?: number;
}

/**
 * Información sobre el progreso de la descarga en streaming/resumible.
 */
export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}

/**
 * Resultado de la verificación de integridad y autenticidad del binario.
 */
export interface VerificationResult {
  valid: boolean;
  sha256Valid: boolean;
  signatureValid: boolean;
  reason?: string;
  calculatedSha256?: string;
}

/**
 * Parámetros para el motor de reemplazo nativo (swapper) en Windows.
 */
export interface UpdateSwapOptions {
  targetExePath: string;
  newExePath: string;
  backupExePath?: string;
  timeoutSeconds?: number;
  processNamesToKill?: string[];
  scriptDir?: string;
  postUpdateArgs?: string[];
}

/**
 * Snapshot del estado actual del cliente de actualización.
 */
export interface UpdateClientState {
  status: UpdateStatus;
  currentVersion: string;
  pendingUpdate: PendingUpdate | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  downloadProgress: DownloadProgress | null;
}
