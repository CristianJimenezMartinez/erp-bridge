export type QueueEventType = 'STOCK_SYNC' | 'ORDER_PUSH' | 'ORDER_ACK' | (string & {});

export type QueueEventStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface QueueEvent<T = any> {
  id: string;
  timestamp: number;
  type: QueueEventType;
  payload: T;
  attempts: number;
  status: QueueEventStatus;
  nextRetryAt: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  maxAttempts?: number;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface EnqueueOptions {
  id?: string;
  timestamp?: number;
  delayMs?: number;
  priority?: number;
  maxAttempts?: number;
  metadata?: Record<string, any>;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueFilter {
  status?: QueueEventStatus | QueueEventStatus[];
  type?: QueueEventType | QueueEventType[];
  limit?: number;
  offset?: number;
}

export interface IEventQueue {
  enqueue<T = any>(type: QueueEventType, payload: T, options?: EnqueueOptions): Promise<QueueEvent<T>>;
  dequeue(): Promise<QueueEvent | null>;
  peek(): Promise<QueueEvent | null>;
  acknowledge(id: string): Promise<void>;
  fail(id: string, error: string | Error, retryable?: boolean): Promise<void>;
  getStats(): Promise<QueueStats>;
  getEvent(id: string): Promise<QueueEvent | null>;
  getAllEvents(filter?: QueueFilter): Promise<QueueEvent[]>;
  recoverStaleProcessing(staleTimeoutMs?: number): Promise<number>;
  clear(): Promise<void>;
}

export interface FileQueueOptions {
  /**
   * Ruta al archivo de almacenamiento (ej: '.../events-queue.json') o directorio donde se creará.
   */
  storagePath?: string;
  /**
   * Directorio de almacenamiento alternativo.
   */
  storageDir?: string;
  /**
   * Número máximo de reintentos antes de marcar como FAILED (default: 5).
   */
  maxRetries?: number;
  /**
   * Retardo base en ms para backoff exponencial (default: 1000ms).
   */
  baseDelayMs?: number;
  /**
   * Retardo máximo en ms para backoff exponencial (default: 60000ms).
   */
  maxDelayMs?: number;
  /**
   * Tiempo en ms tras el cual un evento en PROCESSING se considera estancado/huérfano (default: 60000ms).
   */
  staleTimeoutMs?: number;
  /**
   * Si es true, recupera automáticamente eventos en PROCESSING al iniciar la cola (default: true).
   */
  recoverOnStartup?: boolean;
  /**
   * Máximo de eventos COMPLETED a retener en memoria y disco (default: 500).
   */
  maxCompletedHistory?: number;
}

export type QueueEventHandler<T = any> = (event: QueueEvent<T>) => Promise<void | boolean>;

export interface QueueWorkerOptions {
  /**
   * Intervalo de sondeo en milisegundos cuando la cola está vacía o en reposo (default: 1000ms).
   */
  pollIntervalMs?: number;
  /**
   * Número máximo de reintentos automáticos para eventos fallidos (default: 5).
   */
  maxRetries?: number;
  /**
   * Retardo base en ms para backoff exponencial (default: 1000ms).
   */
  baseDelayMs?: number;
  /**
   * Retardo máximo en ms para backoff exponencial (default: 60000ms).
   */
  maxDelayMs?: number;
  /**
   * Tiempo en ms para considerar un evento estancado en PROCESSING (default: 60000ms).
   */
  staleTimeoutMs?: number;
  /**
   * Comprobador de conectividad de red / online (default: true).
   */
  isOnline?: () => boolean | Promise<boolean>;
  /**
   * Iniciar el bucle de procesamiento automáticamente al instanciar (default: false).
   */
  autoStart?: boolean;
}
