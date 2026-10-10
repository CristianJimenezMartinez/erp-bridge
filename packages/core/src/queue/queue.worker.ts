import { Logger } from '@erp-bridge/shared';
import {
  IEventQueue,
  QueueEventHandler,
  QueueEventType,
  QueueWorkerOptions,
} from './queue.types';

export class QueueWorker {
  private readonly logger = new Logger('QueueWorker');
  private readonly queue: IEventQueue;
  private readonly handlers = new Map<QueueEventType, QueueEventHandler>();
  private defaultHandler?: QueueEventHandler;

  private running = false;
  private processing = false;
  private timer: NodeJS.Timeout | null = null;
  private lastStaleCheck = 0;

  private readonly pollIntervalMs: number;
  private readonly staleTimeoutMs: number;
  private isOnlineFn?: () => boolean | Promise<boolean>;

  constructor(queue: IEventQueue, options?: QueueWorkerOptions) {
    this.queue = queue;
    this.pollIntervalMs = options?.pollIntervalMs ?? 1000;
    this.staleTimeoutMs = options?.staleTimeoutMs ?? 60000;
    this.isOnlineFn = options?.isOnline;

    if (options?.autoStart) {
      this.start();
    }
  }

  /**
   * Registra un manejador específico para un tipo de evento.
   */
  public registerHandler<T = any>(type: QueueEventType, handler: QueueEventHandler<T>): this {
    this.handlers.set(type, handler as QueueEventHandler);
    return this;
  }

  /**
   * Registra un manejador por defecto si el tipo de evento no coincide con ninguno específico.
   */
  public setDefaultHandler<T = any>(handler: QueueEventHandler<T>): this {
    this.defaultHandler = handler as QueueEventHandler;
    return this;
  }

  /**
   * Configura o actualiza la función evaluadora de estado de conexión.
   */
  public setIsOnline(fn: () => boolean | Promise<boolean>): this {
    this.isOnlineFn = fn;
    return this;
  }

  /**
   * Inicia el bucle de procesamiento en segundo plano.
   */
  public start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info(`QueueWorker iniciado (intervalo de sondeo: ${this.pollIntervalMs}ms)`);
    this.scheduleNext(0);
  }

  /**
   * Detiene el bucle de procesamiento y espera a que la tarea en curso finalice.
   */
  public async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Esperar a que la tarea en curso termine
    let waitCount = 0;
    while (this.processing && waitCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      waitCount++;
    }

    this.logger.info('QueueWorker detenido.');
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Comprueba si el entorno está online.
   */
  private async checkOnline(): Promise<boolean> {
    if (this.isOnlineFn) {
      try {
        return await Promise.resolve(this.isOnlineFn());
      } catch (err) {
        this.logger.warn(`Error al evaluar condición online: ${String(err)}`);
        return false;
      }
    }

    // Si la cola misma tiene método isOnline (ej: StoreAndForwardQueue)
    const sfQueue = this.queue as any;
    if (typeof sfQueue.isOnline === 'function') {
      return Boolean(sfQueue.isOnline());
    }

    return true;
  }

  /**
   * Procesa un único evento elegible de la cola.
   * Retorna true si se procesó un evento, false si la cola estaba vacía, offline o no hubo eventos listos.
   */
  public async processNext(): Promise<boolean> {
    const online = await this.checkOnline();
    if (!online) {
      return false;
    }

    // Periódicamente verificar y recuperar eventos estancados
    const now = Date.now();
    if (now - this.lastStaleCheck > 30000) {
      this.lastStaleCheck = now;
      try {
        await this.queue.recoverStaleProcessing(this.staleTimeoutMs);
      } catch (err) {
        this.logger.warn(`Error al recuperar eventos estancados: ${String(err)}`);
      }
    }

    const event = await this.queue.dequeue();
    if (!event) {
      return false;
    }

    this.processing = true;
    try {
      const handler = this.handlers.get(event.type) || this.defaultHandler;

      if (!handler) {
        const errorMsg = `No hay handler registrado para el tipo de evento [${event.type}]`;
        this.logger.error(errorMsg);
        await this.queue.fail(event.id, errorMsg, false);
        return true;
      }

      try {
        const result = await handler(event);
        if (result === false) {
          await this.queue.fail(event.id, 'El manejador devolvió false (fallo explícito)', true);
        } else {
          await this.queue.acknowledge(event.id);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.queue.fail(event.id, errorMsg, true);
      }

      return true;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Drena secuencialmente todos los eventos pendientes listos hasta que no queden más o se desconecte.
   * Útil para pruebas unitarias, flush manual o reconexión inmediata.
   */
  public async drain(maxEvents = 1000): Promise<number> {
    let processedCount = 0;
    while (processedCount < maxEvents) {
      const processed = await this.processNext();
      if (!processed) {
        break;
      }
      processedCount++;
    }
    return processedCount;
  }

  private scheduleNext(delay: number): void {
    if (!this.running) return;

    this.timer = setTimeout(async () => {
      let hasMore = false;
      try {
        hasMore = await this.processNext();
      } catch (err) {
        this.logger.error(`Error no controlado en ciclo de QueueWorker: ${String(err)}`);
      } finally {
        if (this.running) {
          // Si procesamos un elemento exitosamente, reprogramamos de inmediato (5ms) para vaciar backlog rápido;
          // si la cola estaba vacía o en reposo, respetamos el pollIntervalMs.
          const nextDelay = hasMore ? 5 : this.pollIntervalMs;
          this.scheduleNext(nextDelay);
        }
      }
    }, delay);
  }
}
