import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@erp-bridge/shared';
import {
  FileQueueOptions,
  IEventQueue,
  QueueEvent,
  QueueEventType,
  QueueFilter,
  QueueStats,
  EnqueueOptions,
} from './queue.types';

class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  public acquire<T>(fn: () => Promise<T> | T): Promise<T> {
    const task = this.queue.then(fn);
    this.queue = task.then(() => {}, () => {});
    return task;
  }
}

export class FileEventQueue implements IEventQueue {
  private readonly logger = new Logger('FileEventQueue');
  private readonly filePath: string;
  private readonly backupPath: string;
  private readonly lock = new AsyncLock();

  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly staleTimeoutMs: number;
  private readonly maxCompletedHistory: number;

  private events: QueueEvent[] = [];
  private initialized = false;

  constructor(options?: FileQueueOptions) {
    this.maxRetries = options?.maxRetries ?? 5;
    this.baseDelayMs = options?.baseDelayMs ?? 1000;
    this.maxDelayMs = options?.maxDelayMs ?? 60000;
    this.staleTimeoutMs = options?.staleTimeoutMs ?? 60000;
    this.maxCompletedHistory = options?.maxCompletedHistory ?? 500;

    this.filePath = this.resolveStoragePath(options);
    this.backupPath = `${this.filePath}.bak`;

    this.initialize(options?.recoverOnStartup ?? true);
  }

  public getStoragePath(): string {
    return this.filePath;
  }

  private resolveStoragePath(options?: FileQueueOptions): string {
    if (options?.storagePath) {
      if (options.storagePath.endsWith('.json')) {
        return path.resolve(options.storagePath);
      }
      return path.resolve(options.storagePath, 'events-queue.json');
    }

    if (options?.storageDir) {
      return path.resolve(options.storageDir, 'events-queue.json');
    }

    // Ubicación por defecto dentro del directorio de trabajo o AppData si está disponible
    const baseDir = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'Bentian Agent', 'queue')
      : path.join(process.cwd(), '.bentian', 'queue');

    return path.join(baseDir, 'events-queue.json');
  }

  private initialize(recoverOnStartup: boolean): void {
    if (this.initialized) return;

    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.events = this.loadFromDisk();

      if (recoverOnStartup) {
        let recoveredCount = 0;
        const now = new Date().toISOString();
        for (const evt of this.events) {
          if (evt.status === 'PROCESSING') {
            evt.status = 'PENDING';
            evt.updatedAt = now;
            recoveredCount++;
          }
        }
        if (recoveredCount > 0) {
          this.logger.info(`Recuperados ${recoveredCount} eventos estancados en PROCESSING al iniciar cola`);
          this.atomicSaveSync();
        }
      }

      this.initialized = true;
    } catch (err) {
      this.logger.error(`Fallo al inicializar cola en disco: ${String(err)}`);
      this.events = [];
      this.initialized = true;
    }
  }

  private loadFromDisk(): QueueEvent[] {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8').replace(/^\uFEFF/, '').trim();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (err) {
        this.logger.warn(`Archivo de cola corrupto en ${this.filePath}. Intentando respaldo .bak...: ${String(err)}`);
      }
    }

    // Fallback a backup si el primario falló o no existe
    if (fs.existsSync(this.backupPath)) {
      try {
        const rawBak = fs.readFileSync(this.backupPath, 'utf8').replace(/^\uFEFF/, '').trim();
        if (rawBak) {
          const parsedBak = JSON.parse(rawBak);
          if (Array.isArray(parsedBak)) {
            this.logger.info(`✓ Cola restaurada exitosamente desde archivo de respaldo ${this.backupPath}`);
            return parsedBak;
          }
        }
      } catch (bakErr) {
        this.logger.error(`Error leyendo respaldo .bak de cola: ${String(bakErr)}`);
      }
    }

    return [];
  }

  private atomicSaveSync(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempFile = `${this.filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const content = JSON.stringify(this.events, null, 2);

    try {
      fs.writeFileSync(tempFile, content, 'utf8');

      // Si existe el archivo actual y es legible, actualizar respaldo .bak primero
      if (fs.existsSync(this.filePath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch {
          // Ignorar fallo no crítico en creación de backup temporal
        }
      }

      // Reemplazo atómico con reintentos para bloqueos de Windows
      let replaced = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (fs.existsSync(this.filePath)) {
            try {
              fs.unlinkSync(this.filePath);
            } catch {
              // Si no se puede desvincular directamente, intentar renameSync que sobreescribe en algunos entornos
            }
          }
          fs.renameSync(tempFile, this.filePath);
          replaced = true;
          break;
        } catch {
          const delay = (attempt + 1) * 20;
          const end = Date.now() + delay;
          while (Date.now() < end) {
            // micro-espera activa síncrona
          }
        }
      }

      if (!replaced) {
        fs.copyFileSync(tempFile, this.filePath);
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }

      // Si no existía backup (primera escritura), inicializarlo con una copia del archivo
      if (!fs.existsSync(this.backupPath)) {
        try {
          fs.copyFileSync(this.filePath, this.backupPath);
        } catch {}
      }
    } catch (err) {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
      this.logger.error(`Error persistiendo cola en ${this.filePath}: ${String(err)}`);
      throw err;
    }
  }

  public async enqueue<T = any>(
    type: QueueEventType,
    payload: T,
    options?: EnqueueOptions
  ): Promise<QueueEvent<T>> {
    return this.lock.acquire(async () => {
      const now = Date.now();
      const isoNow = new Date(now).toISOString();

      const eventId = options?.id || `evt_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      const delayMs = Math.max(0, options?.delayMs || 0);

      const event: QueueEvent<T> = {
        id: eventId,
        timestamp: options?.timestamp || now,
        type,
        payload,
        attempts: 0,
        status: 'PENDING',
        nextRetryAt: now + delayMs,
        createdAt: isoNow,
        updatedAt: isoNow,
        priority: options?.priority ?? 0,
        maxAttempts: options?.maxAttempts ?? this.maxRetries,
        metadata: options?.metadata,
      };

      this.events.push(event);
      this.atomicSaveSync();

      return JSON.parse(JSON.stringify(event));
    });
  }

  public async dequeue(): Promise<QueueEvent | null> {
    return this.lock.acquire(async () => {
      const now = Date.now();

      const eligible = this.events.filter(
        (evt) => evt.status === 'PENDING' && evt.nextRetryAt <= now
      );

      if (eligible.length === 0) {
        return null;
      }

      eligible.sort((a, b) => {
        const priorityA = a.priority ?? 0;
        const priorityB = b.priority ?? 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        return a.timestamp - b.timestamp;
      });

      const targetEvent = eligible[0];
      if (!targetEvent) {
        return null;
      }

      targetEvent.status = 'PROCESSING';
      targetEvent.attempts += 1;
      targetEvent.updatedAt = new Date().toISOString();

      this.atomicSaveSync();

      return JSON.parse(JSON.stringify(targetEvent));
    });
  }

  public async peek(): Promise<QueueEvent | null> {
    return this.lock.acquire(async () => {
      const now = Date.now();

      const eligible = this.events
        .filter((evt) => evt.status === 'PENDING' && evt.nextRetryAt <= now)
        .sort((a, b) => {
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityB !== priorityA) {
            return priorityB - priorityA;
          }
          return a.timestamp - b.timestamp;
        });

      const first = eligible[0];
      if (!first) {
        return null;
      }

      return JSON.parse(JSON.stringify(first));
    });
  }

  public async acknowledge(id: string): Promise<void> {
    return this.lock.acquire(async () => {
      const event = this.events.find((e) => e.id === id);
      if (!event) {
        this.logger.warn(`acknowledge: Evento ${id} no encontrado en la cola`);
        return;
      }

      event.status = 'COMPLETED';
      event.updatedAt = new Date().toISOString();

      this.pruneCompleted();
      this.atomicSaveSync();
    });
  }

  public async fail(id: string, error: string | Error, retryable: boolean = true): Promise<void> {
    return this.lock.acquire(async () => {
      const event = this.events.find((e) => e.id === id);
      if (!event) {
        this.logger.warn(`fail: Evento ${id} no encontrado en la cola`);
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      event.error = errorMessage;
      event.updatedAt = new Date().toISOString();

      const maxLimit = event.maxAttempts ?? this.maxRetries;

      if (retryable && event.attempts < maxLimit) {
        event.status = 'PENDING';
        // Backoff exponencial con jitter: baseDelay * 2^(attempts-1) + jitter
        const exponentialDelay = this.baseDelayMs * Math.pow(2, Math.max(0, event.attempts - 1));
        const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
        const jitter = Math.floor(Math.random() * 50);
        event.nextRetryAt = Date.now() + cappedDelay + jitter;

        this.logger.warn(
          `Evento [${event.type}:${event.id}] falló (intento ${event.attempts}/${maxLimit}). Reintento programado en ${cappedDelay + jitter}ms: ${errorMessage}`
        );
      } else {
        event.status = 'FAILED';
        event.nextRetryAt = 0;
        this.logger.error(
          `Evento [${event.type}:${event.id}] marcado como FAILED definitivamente tras ${event.attempts} intentos: ${errorMessage}`
        );
      }

      this.atomicSaveSync();
    });
  }

  public async getStats(): Promise<QueueStats> {
    return this.lock.acquire(async () => {
      let pending = 0;
      let processing = 0;
      let completed = 0;
      let failed = 0;

      for (const evt of this.events) {
        switch (evt.status) {
          case 'PENDING':
            pending++;
            break;
          case 'PROCESSING':
            processing++;
            break;
          case 'COMPLETED':
            completed++;
            break;
          case 'FAILED':
            failed++;
            break;
        }
      }

      return {
        total: this.events.length,
        pending,
        processing,
        completed,
        failed,
      };
    });
  }

  public async getEvent(id: string): Promise<QueueEvent | null> {
    return this.lock.acquire(async () => {
      const event = this.events.find((e) => e.id === id);
      return event ? JSON.parse(JSON.stringify(event)) : null;
    });
  }

  public async getAllEvents(filter?: QueueFilter): Promise<QueueEvent[]> {
    return this.lock.acquire(async () => {
      let filtered = [...this.events];

      if (filter?.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        filtered = filtered.filter((e) => statuses.includes(e.status));
      }

      if (filter?.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        filtered = filtered.filter((e) => types.includes(e.type));
      }

      if (filter?.offset && filter.offset > 0) {
        filtered = filtered.slice(filter.offset);
      }

      if (filter?.limit && filter.limit > 0) {
        filtered = filtered.slice(0, filter.limit);
      }

      return JSON.parse(JSON.stringify(filtered));
    });
  }

  public async recoverStaleProcessing(staleTimeoutMs?: number): Promise<number> {
    return this.lock.acquire(async () => {
      const timeout = staleTimeoutMs ?? this.staleTimeoutMs;
      const threshold = Date.now() - timeout;
      let recovered = 0;

      for (const evt of this.events) {
        if (evt.status === 'PROCESSING') {
          const updatedTime = new Date(evt.updatedAt).getTime();
          if (updatedTime < threshold) {
            evt.status = 'PENDING';
            evt.updatedAt = new Date().toISOString();
            recovered++;
          }
        }
      }

      if (recovered > 0) {
        this.logger.info(`Recuperados ${recovered} eventos estancados en PROCESSING`);
        this.atomicSaveSync();
      }

      return recovered;
    });
  }

  public async clear(): Promise<void> {
    return this.lock.acquire(async () => {
      this.events = [];
      this.atomicSaveSync();
    });
  }

  private pruneCompleted(): void {
    const completed = this.events.filter((e) => e.status === 'COMPLETED');
    if (completed.length > this.maxCompletedHistory) {
      const excess = completed.length - this.maxCompletedHistory;
      const toRemove = new Set(completed.slice(0, excess).map((e) => e.id));
      this.events = this.events.filter((e) => !toRemove.has(e.id));
    }
  }
}
